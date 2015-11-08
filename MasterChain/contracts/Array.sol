contract Identity {

  uint pan;
  
  uint[] selfie;
  uint selfieWidth;
  uint selfieHeight;
  
  uint[] fp;
  uint fpWidth;
  uint fpHeight;
  
  uint dlNumber;
  
  uint fico;
  
  function Identity(uint pan_, uint[] selfie_, uint selfieWidth_, uint selfieHeight_, uint[] fp_, uint fpWidth_, uint fpHeight_, uint dlNumber_, uint fico_) {
    
	pan = pan_;
	
	selfie = selfie_;
	selfieWidth = selfieWidth_;
	selfieHeight = selfieHeight_;
	
	fp = fp_;
	fpWidth = fpWidth_;
	fpHeight = fpHeight_;
	
	dlNumber = dlNumber_;
	
	fico = fico_;
  }

  function getSelfie() returns (uint[] selfie){
    stake[stakeholder] = currentStake;

    stakeHolders.length = numStakeHolders+1;
    stakeHolders[numStakeHolders] = stakeholder;
    numStakeHolders++;

    holdingTheBag = stakeholder;

    sumStake += currentStake;
    currentStake = currentStake / 2; // note that this is not a get what you put in sort of scheme
  }

  function payout() { 
    uint bal = this.balance;    
    uint j;

    for (j = 0; j < stakeHolders.length; j++)
    {
      stakeHolders[j].send(bal * stake[stakeHolders[j]] / sumStake);
    }
  }
}