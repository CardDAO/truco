import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellEnvidoEnvido = ({match, processingAction, setProcessingAction}: any) => {

    return (
        <CommonActionWrite
            match={match}
            contractInterface={new Interface(["function spellEnvidoEnvido() public"])}
            functionName={"spellEnvidoEnvido"}
            args={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="Spell Envido-Envido!"
        />
    )
}
