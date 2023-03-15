const {expect} = require ('chai');
const {ethers} = require ('hardhat');

describe("delegatecall Attack", function() {
    it("should change the owner of the Good Contract", async function() {
        const Helper = await ethers.getContractFactory('Helper');
        const helperContract = await Helper.deploy();
        await helperContract.deployed();
        console.log("Helper Contract Address:", helperContract.address);       
        
    // Deploy the good contract
    const Good = await ethers.getContractFactory("Good");
    const goodContract = await Good.deploy(helperContract.address);
    await goodContract.deployed();
    console.log("Good Contract's Address:", goodContract.address);

    // Deploy the Attack contract
    const Attack = await ethers.getContractFactory("Attack");
    const attackContract = await Attack.deploy(goodContract.address);
    await attackContract.deployed();
    console.log("Attack Contract's Address", attackContract.address);        


    //let's attack the good contract
    
    let tx = await attackContract.attack();
    await tx.wait();

    expect(await goodContract.owner()).to.equal(attackContract.address);
    
    });
});


/* 
Breakdown of the delegatecall attack

1. The attacker will first deploy the Attack.sol contract and will take the address of a Good contract in the constructor

2. attacker then calls the attack function which will further initially call the setNum function present inside Good.sol
Interesting point to note is the argument with which the setNum is initially called, 
its an address typecasted into a uint256, which is it's own address.

3.After setNum function within the Good.sol contract receives the address as a uint, 
it further does a delegatecall to the Helper contract because right now the helper variable is set to the address of the Helper contract.

4. Within the Helper contract when the setNum is executed, it sets the _num which in our case right now is the address of Attack.sol typecasted into a uint into num.

5.Note that because num is located at Slot 0 of Helper contract, it will actually assign the address of Attack.sol to Slot 0 of Good.sol
You may see where this is going. Slot 0 of Good is the helper variable, which means, 
the attacker has successfully been able to update the helper address variable to it's own contract now.

6. The next thing that gets executed in the attack function within Attack.sol is another setNum but with number 1. 
The number 1 plays no relevance here, and could've been set to anything.

7. Now when setNum gets called within Good.sol it will delegate the call to Attack.sol 
because the address of helper contract has been overwritten.

8. The setNum within Attack.sol gets executed which sets the owner to msg.sender which in this case is Attack.sol itself because it was the original caller of the delegatecall 
and because owner is at Slot 1 of Attack.sol, the Slot 1 of Good.sol will be overwritten which is its owner.

9. YESS-- the attacker was able to change the owner of Good.sol


PREVENTION

Use stateless library contracts which means that the contracts to which you delegate the call should only be used for execution of logic and should not maintain state. 
This way, it is not possible for functions in the library to modify the state of the calling contract.

*/