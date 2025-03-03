import { StandardConnectOutput } from "@mysten/wallet-standard";
export default function getActiveChainFromConnectResult(connectRes: StandardConnectOutput): `${string}:${string}`;
