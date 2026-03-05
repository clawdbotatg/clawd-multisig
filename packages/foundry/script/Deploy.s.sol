//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployMetaMultiSigWallet } from "./DeployMetaMultiSigWallet.s.sol";

contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        DeployMetaMultiSigWallet deployMultisig = new DeployMetaMultiSigWallet();
        deployMultisig.run();
    }
}
