import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellRealEnvido = ({match, processingAction, setProcessingAction}: any) => {

    return (
        <CommonActionWrite
            match={match}
            contractInterface={new Interface(["function spellRealEnvido() public"])}
            functionName={"spellRealEnvido"}
            args={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="Spell RealEnvido!"
        />
    )
}
