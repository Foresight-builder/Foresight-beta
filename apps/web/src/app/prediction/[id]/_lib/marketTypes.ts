export type MarketInfo = {
  market: string;
  chain_id: number;
  collateral_token?: string;
  tick_size?: number;
  fee_bps?: number;
};
