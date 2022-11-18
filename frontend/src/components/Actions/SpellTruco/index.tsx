import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellTruco = ({match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            writeSelectorInterface={new Interface(["function spellTruco() public"])}
            writeFunctionName={"spellTruco"}
            writeArgs={[]}
            checkExecute={true}
            canSelectorInterface={new Interface(["function canSpellTruco(address) external view returns(bool)"])}
            canFunctionName="canSpellTruco"
            canFunctionArgs={[match]}
            canContractAddress={process.env.FRONT_MATCH_FACADE_ADDRESS}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="Spell Truco!"
        />
    )

}
