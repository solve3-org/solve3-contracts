//SPDX-License-Identifier: MIT

pragma solidity 0.8.7;
import "./ISolve3Verifier.sol";

abstract contract Solve3Verify {
    string public constant VERSION = "SOLVE3.V0";
    ISolve3Verifier public immutable verifier;
    bool public solve3Disabled = false;
    uint256 public validFromTimestamp;
    uint256 public validPeriodSeconds = 300;

    constructor(address _verifier) {
        verifier = ISolve3Verifier(_verifier);
        validFromTimestamp = block.timestamp;
    }

    modifier verify(bytes memory _proof) {
        if (!solve3Disabled) {
            (address account, uint256 timestamp, bool verified) = verifier
            .verifyProof(keccak256(abi.encodePacked(VERSION)), _proof);
            
            require(
                verified,
                "Solve3Verify: Unable to verify message"
            );
            require(
                account == msg.sender,
                "Solve3Verify: Sender and solver do not match"
            );
            require(
                timestamp >= validFrom(),
                "Solve3Verify: Message was signed too early"
            );
            require(
                timestamp + validPeriod() >= block.timestamp,
                "Solve3Verify: Signature is no longer valid"
            );
        }
        _;
    }

    modifier solve3IsDisabled() {
        require(
            solve3Disabled,
            "Solution3Verify: Verification is not disabled"
        );
        _;
    }

    modifier solve3IsNotDisabled() {
        require(!solve3Disabled, "Solution3Verify: Verification is disabled");
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

    event Paused(bool _paused);
}
