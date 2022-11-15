import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellTruco = ({match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            contractInterface={new Interface(["function spellTruco() public"])}
            functionName={"spellTruco"}
            args={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="Spell Truco!"
        />
    )

}
