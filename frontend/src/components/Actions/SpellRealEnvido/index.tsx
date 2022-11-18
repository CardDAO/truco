import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellRealEnvido = ({match, processingAction, setProcessingAction}: any) => {

    return (
        <CommonActionWrite
            match={match}
            writeSelectorInterface={new Interface(["function spellRealEnvido() public"])}
            writeFunctionName={"spellRealEnvido"}
            writeArgs={[]}
            buttonText="Spell RealEnvido!"
            checkExecute={true}
            canSelectorInterface={new Interface(["function canSpellEnvido(address) external view returns(bool)"])}
            canFunctionName="canSpellEnvido"
            canFunctionArgs={[match]}
            canContractAddress={process.env.FRONT_MATCH_FACADE_ADDRESS}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
        />
    )
}
