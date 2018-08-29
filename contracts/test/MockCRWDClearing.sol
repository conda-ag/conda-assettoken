pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../interfaces/ICRWDClearing.sol";

/** @title mocked clearing for tests. */
contract MockCrwdClearing is Ownable {
    using SafeMath for uint256;

    uint256 companyFee;
    uint256 investorFee;
    address crwdToken;
    address condaAddress;
    address companyAddress;

    function clearFunds(address /*_underlyingCurrency*/, address _from, address /*_to*/, uint256 _amount) public returns (bool) {
        

        if (companyFee > 0) {
            uint256 feeCompanyToPay = _amount.mul(companyFee).div(1000);
            if (!ERC20(crwdToken).transferFrom(companyAddress, condaAddress, feeCompanyToPay)) 
                revert();
        }

        if (investorFee > 0) {
            uint256 feeInvestorToPay = _amount.mul(investorFee).div(1000);
            if (!ERC20(crwdToken).transferFrom(_from, condaAddress, feeInvestorToPay)) 
                revert();
        }

        return true;
    }

    function setFee(address _crwdToken, uint256 _companyFee, uint256 _investorFee, address _condaAddress, address _companyAddress)
    public
    onlyOwner 
    {
        crwdToken = _crwdToken;
        companyFee = _companyFee;
        investorFee = _investorFee;
        condaAddress = _condaAddress;
        companyAddress = _companyAddress;
    }
}