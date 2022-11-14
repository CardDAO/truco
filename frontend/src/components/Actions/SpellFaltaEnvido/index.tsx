import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellFaltaEnvido = ({match, processingAction, setProcessingAction}: any) => {

    return (
        <CommonActionWrite
            match={match}
            contractInterface={new Interface(["function spellFaltaEnvido() public"])}
            functionName={"spellFaltaEnvido"}
            args={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="Spell FaltaEnvido!"
        />
    )
}
