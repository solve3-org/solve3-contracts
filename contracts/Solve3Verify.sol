//SPDX-License-Identifier: MIT

pragma solidity 0.8.7;
import "./ISolve3Master.sol";

abstract contract Solve3Verify {
    string public constant VERSION = "SOLVE3.V0";
    ISolve3Master public immutable solve3Master;
    bool public solve3Disabled = false;
    uint256 public validFromTimestamp;
    uint256 public validPeriodSeconds = 300;

    constructor(address _solve3Master) {
        solve3Master = ISolve3Master(_solve3Master);
        validFromTimestamp = block.timestamp;
    }

    modifier verify(bytes memory _proof) {
        if (!solve3Disabled) {
            (address account, uint256 timestamp, bool verified) = solve3Master
            .verifyProof(_version(), _proof);
            
            if(!verified) revert Solve3VerifyUnableToVerify();
            if(account != msg.sender) revert Solve3VerifyAddressMismatch();
            if(timestamp < validFrom()) revert Solve3VerifyMsgSignedTooEarly();
            if(timestamp + validPeriod() < block.timestamp) revert Solve3VerifySignatureInvalid();
        }
        _;
    }

    modifier solve3IsDisabled() {
        if (!solve3Disabled) revert Solve3VerifySolve3IsNotDisabled();
        _;
    }

    modifier solve3IsNotDisabled() {
        if (solve3Disabled) revert Solve3VerifySolve3IsDisabled();
        _;
    }

    function validFrom() public view virtual returns (uint256) {
        return validFromTimestamp;
    }

    function validPeriod() public view virtual returns (uint256) {
        return validPeriodSeconds;
    }

    function disableSolve3(bool _paused) external virtual;

    function _disableSolve3(bool _paused) internal {
        solve3Disabled = _paused;
        emit Paused(_paused);
    }

    function _setValidFromTimestamp(uint256 _validFromTimestamp) internal {
        validFromTimestamp = _validFromTimestamp;
    }

    function setValidPeriodSeconds(uint256 _validPeriodSeconds)
        external
        virtual;

    function _setValidPeriodSeconds(uint256 _validPeriodSeconds) internal {
        validPeriodSeconds = _validPeriodSeconds;
    }

    function _version() internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(VERSION));
    }

    event Paused(bool _paused);

    error Solve3VerifySolve3IsDisabled();
    error Solve3VerifySolve3IsNotDisabled();
    error Solve3VerifyUnableToVerify();
    error Solve3VerifyAddressMismatch();
    error Solve3VerifyMsgSignedTooEarly();
    error Solve3VerifySignatureInvalid();
}
