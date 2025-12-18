import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    types: {
      CancelSaltRequest: [
        { name: "maker", type: "address" },
        { name: "salt", type: "uint256" },
      ],
    },
  });
}
