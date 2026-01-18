/// <reference types="@nomicfoundation/hardhat-ethers" />
import hre from "hardhat";
import fs from "fs";

type Tx = {
  to: string;
  value: string;
  data: string;
};

type BatchItem = {
  target: string;
  valueWei?: string;
  functionSignature: string;
  args?: any[];
};

type Output = {
  chainId: number;
  network: string;
  timelock: string;
  minDelaySeconds: number;
  operation:
    | {
        kind: "single";
        predecessor: string;
        salt: string;
        target: string;
        value: string;
        data: string;
        operationId: string;
      }
    | {
        kind: "batch";
        predecessor: string;
        salt: string;
        targets: string[];
        values: string[];
        datas: string[];
        operationId: string;
      };
  txs: {
    schedule: Tx;
    execute: Tx;
  };
};

function requireEnv(name: string): string {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function optionalEnv(name: string): string | undefined {
  const v = String(process.env[name] || "").trim();
  return v ? v : undefined;
}

function parseJsonArray(raw: string): any[] {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) throw new Error("ARGS_JSON must be a JSON array");
  return parsed;
}

function parseBatchJson(raw: string): BatchItem[] {
  const trimmed = String(raw || "").trim();
  if (!trimmed) throw new Error("BATCH_JSON is empty");
  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) throw new Error("BATCH_JSON must be a JSON array");
  for (const item of parsed) {
    if (!item || typeof item !== "object") throw new Error("BATCH_JSON items must be objects");
    if (!String(item.target || "").trim()) throw new Error("BATCH_JSON item missing target");
    if (!String(item.functionSignature || "").trim())
      throw new Error("BATCH_JSON item missing functionSignature");
    if (item.args != null && !Array.isArray(item.args))
      throw new Error("BATCH_JSON item args must be an array");
  }
  return parsed as BatchItem[];
}

function encodeFunctionCall(functionSignature: string, args: any[]): string {
  const iface = new hre.ethers.Interface([`function ${functionSignature}`]);
  const fragment = iface.getFunction(functionSignature);
  if (!fragment) throw new Error(`Function ${functionSignature} not found`);
  return iface.encodeFunctionData(fragment, args);
}

function hashOperation(params: {
  target: string;
  valueWei: bigint;
  data: string;
  predecessor: string;
  salt: string;
}): string {
  const coder = hre.ethers.AbiCoder.defaultAbiCoder();
  const encoded = coder.encode(
    ["address", "uint256", "bytes", "bytes32", "bytes32"],
    [params.target, params.valueWei, params.data, params.predecessor, params.salt]
  );
  return hre.ethers.keccak256(encoded);
}

function hashOperationBatch(params: {
  targets: string[];
  valuesWei: bigint[];
  datas: string[];
  predecessor: string;
  salt: string;
}): string {
  const coder = hre.ethers.AbiCoder.defaultAbiCoder();
  const encoded = coder.encode(
    ["address[]", "uint256[]", "bytes[]", "bytes32", "bytes32"],
    [params.targets, params.valuesWei, params.datas, params.predecessor, params.salt]
  );
  return hre.ethers.keccak256(encoded);
}

async function main() {
  const env = process.env;

  const timelockAddress = requireEnv("TIMELOCK_ADDRESS");

  const predecessor = optionalEnv("PREDECESSOR") || hre.ethers.ZeroHash;
  const salt =
    optionalEnv("SALT") || hre.ethers.id(optionalEnv("DESCRIPTION") || `foresight:${Date.now()}`);

  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactoryIface = MarketFactory.interface;

  const timelock = await hre.ethers.getContractAt("ForesightTimelock", timelockAddress);
  const delayOverride = optionalEnv("DELAY_SECONDS");
  const minDelay = delayOverride ? Number(delayOverride) : Number(await timelock.getMinDelay());

  const batchJson = optionalEnv("BATCH_JSON");

  let operation: Output["operation"];
  let scheduleData: string;
  let executeData: string;

  if (batchJson) {
    const items = parseBatchJson(batchJson);
    const targets = items.map((i) => i.target);
    const valuesWei = items.map((i) => BigInt(i.valueWei || "0"));
    const datas = items.map((i) => encodeFunctionCall(i.functionSignature, i.args || []));

    const operationId = hashOperationBatch({ targets, valuesWei, datas, predecessor, salt });

    scheduleData = timelock.interface.encodeFunctionData("scheduleBatch", [
      targets,
      valuesWei,
      datas,
      predecessor,
      salt,
      minDelay,
    ]);

    executeData = timelock.interface.encodeFunctionData("executeBatch", [
      targets,
      valuesWei,
      datas,
      predecessor,
      salt,
    ]);

    operation = {
      kind: "batch",
      predecessor,
      salt,
      targets,
      values: valuesWei.map((v) => v.toString()),
      datas,
      operationId,
    };
  } else {
    const targetAddress = requireEnv("TARGET_ADDRESS");
    const operationValue = optionalEnv("VALUE_WEI") || "0";
    const op = optionalEnv("OP")?.toLowerCase();
    const fnSig = optionalEnv("FUNCTION_SIGNATURE");
    const argsJson = optionalEnv("ARGS_JSON");

    let callData: string;
    if (op) {
      if (op === "unpause_factory") {
        callData = marketFactoryIface.encodeFunctionData("unpause", []);
      } else if (op === "unpause_market_by_id") {
        const marketIdRaw = requireEnv("MARKET_ID");
        const marketId = BigInt(marketIdRaw);
        callData = marketFactoryIface.encodeFunctionData("unpauseMarketById", [marketId]);
      } else {
        throw new Error(`Unsupported OP=${op}`);
      }
    } else {
      if (!fnSig) throw new Error("Provide OP or FUNCTION_SIGNATURE");
      const args = parseJsonArray(argsJson || "[]");
      callData = encodeFunctionCall(fnSig, args);
    }

    const valueWei = BigInt(operationValue);
    const operationId = hashOperation({
      target: targetAddress,
      valueWei,
      data: callData,
      predecessor,
      salt,
    });

    scheduleData = timelock.interface.encodeFunctionData("schedule", [
      targetAddress,
      valueWei,
      callData,
      predecessor,
      salt,
      minDelay,
    ]);

    executeData = timelock.interface.encodeFunctionData("execute", [
      targetAddress,
      valueWei,
      callData,
      predecessor,
      salt,
    ]);

    operation = {
      kind: "single",
      predecessor,
      salt,
      target: targetAddress,
      value: valueWei.toString(),
      data: callData,
      operationId,
    };
  }

  const network = await hre.ethers.provider.getNetwork();
  const output: Output = {
    chainId: Number(network.chainId),
    network: hre.network.name,
    timelock: timelockAddress,
    minDelaySeconds: minDelay,
    operation,
    txs: {
      schedule: { to: timelockAddress, value: "0", data: scheduleData },
      execute: { to: timelockAddress, value: "0", data: executeData },
    },
  };

  const outPath = optionalEnv("OUT_FILE");
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  }

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
