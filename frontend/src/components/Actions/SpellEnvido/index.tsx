import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellEnvido = ({match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            writeSelectorInterface={new Interface(["function spellEnvido() public"])}
            writeFunctionName={"spellEnvido"}
            writeArgs={[]}
            buttonText="Envido!"
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
