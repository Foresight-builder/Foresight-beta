export const erc20Abi = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
] as const;

export const lpFeeStakingAbi = [
  "function stakingToken() view returns (address)",
  "function rewardToken() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address user) view returns (uint256)",
  "function earned(address user) view returns (uint256)",
  "function stake(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function getReward() external",
  "function exit() external",
] as const;

export const marketAbi = [
  "function mintCompleteSet(uint256 amount18) external",
  "function redeem(uint256 amount18) external",
  "function redeemCompleteSetOnInvalid(uint256 amount18PerOutcome) external",
  "function state() view returns (uint8)",
  "function outcomeToken() view returns (address)",
  "function fillOrderSigned(tuple(address maker,uint256 outcomeIndex,bool isBuy,uint256 price,uint256 amount,uint256 salt,uint256 expiry) order, bytes signature, uint256 fillAmount) external",
  "function batchFill(tuple(address maker,uint256 outcomeIndex,bool isBuy,uint256 price,uint256 amount,uint256 salt,uint256 expiry)[] orders, bytes[] signatures, uint256[] fillAmounts) external",
  "function resolve() external",
  "function oracle() view returns (address)",
  "function marketId() view returns (bytes32)",
  "function resolutionTime() view returns (uint256)",
] as const;

export const oracleAdapterAbi = [
  "function requestOutcome(bytes32 marketId, uint8 outcomeIndex, bytes calldata claim) external returns (bytes32 assertionId)",
  "function settleOutcome(bytes32 marketId) external",
  "function getMarketStatus(bytes32 marketId) external view returns (uint8 status, uint256 outcome, bytes32 assertionId, uint8 reassertionCount)",
  "function getOutcome(bytes32 marketId) external view returns (uint256)",
  "function uma() external view returns (address)",
] as const;

export const erc1155Abi = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved) external",
] as const;

export const safeAbi = [
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)",
  "function nonce() view returns (uint256)",
] as const;
