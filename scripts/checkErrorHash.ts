import { keccak256, toBytes } from "viem";

const errors = [
    "SafeERC20FailedOperation(address)",
    "SafeTransferFailed()",
    "TransferFailed()",
];

errors.forEach((err) => {
    const hash = keccak256(toBytes(err));
    const sig = hash.slice(0, 10);
    console.log(`${sig} : ${err}`);
});
