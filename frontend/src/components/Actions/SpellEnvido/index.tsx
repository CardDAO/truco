import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellEnvido = ({match, processingAction, setProcessingAction}: any) => {

    return (
        <CommonActionWrite
            match={match}
            contractInterface={new Interface(["function spellEnvido() public"])}
            functionName={"spellEnvido"}
            args={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="Spell Envido!"
        />
    )
}
