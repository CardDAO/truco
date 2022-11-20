import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellValeCuatro = ({ match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            writeSelectorInterface={new Interface(["function spellValeCuatro() public"])}
            writeFunctionName={"spellValeCuatro"}
            writeArgs={[]}
            buttonText="ValeCuatro!"
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
