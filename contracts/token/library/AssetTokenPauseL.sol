pragma solidity ^0.4.24;

library AssetTokenPauseL {

    struct Availability {
        // Flag that determines if the token is yet alive.
        bool tokenAlive;

        // Flag that determines if the token is transferable or not.
        bool transfersPaused;

        // Flag that minting and burning is finished
        bool crowdsalePhaseFinished;

        // Flag that minting and burning is paused
        bool mintingAndBurningPaused;

        // role that can pause/resume
        address pauseControl;
    }

    ///  @dev Function to stop minting new tokens and also disables burning.
    ///  @return True if the operation was successful.
    function finishMinting(Availability storage _self) public returns (bool) {
        if(_self.crowdsalePhaseFinished) {
            return false;
        }

        _self.crowdsalePhaseFinished = true;
        emit MintFinished();
        return true;
    }

    function setPauseControl(Availability storage _self, address _pauseControl) public {
        require(_pauseControl != address(0));
        
        _self.pauseControl = _pauseControl;
    }

    function setTokenAlive(Availability storage _self) public {
        _self.tokenAlive = true;
    }

////////////////
// Pausing token for unforeseen reasons
////////////////

    /// @dev `pauseTransfer` is an alias for `enableTransfers` using the pauseControl modifier
    /// @param _transfersEnabled False if transfers are allowed
    function pauseTransfer(Availability storage _self, bool _transfersEnabled) public
    {
        _self.transfersPaused = !_transfersEnabled;
    }

    /// @dev `pauseMinting` can pause mint/burn
    /// @param _mintingAndBurningEnabled False if minting/burning is allowed
    function pauseCapitalIncreaseOrDecrease(Availability storage _self, bool _mintingAndBurningEnabled) public
    {
        _self.mintingAndBurningPaused = (_mintingAndBurningEnabled == false);
    }

    event MintFinished();
}