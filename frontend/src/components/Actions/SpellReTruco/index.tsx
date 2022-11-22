import { Interface } from "ethers/lib/utils"
import { ChallengeTypes } from "../../Dashboard"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellReTruco = ({ match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            writeSelectorInterface={new Interface(["function spellReTruco() public"])}
            writeFunctionName={"spellReTruco"}
            writeArgs={[]}
            buttonText="Re-Truco!"
            checkExecute={true}
            canSelectorInterface={new Interface(["function canSpellTruco(address) external view returns(bool)"])}
            canFunctionName="canSpellTruco"
            canFunctionArgs={[match]}
            canContractAddress={process.env.FRONT_MATCH_FACADE_ADDRESS}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
        />
    )
}
