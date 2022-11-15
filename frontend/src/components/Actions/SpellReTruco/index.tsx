import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellReTruco = ({match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            contractInterface={new Interface(["function spellReTruco() public"])}
            functionName={"spellReTruco"}
            args={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="Spell Re-Truco!"
        />
    )

}
