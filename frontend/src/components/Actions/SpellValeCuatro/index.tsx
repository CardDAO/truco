import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const SpellValeCuatro = ({match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            contractInterface={new Interface(["function spellValeCuatro() public"])}
            functionName={"spellValeCuatro"}
            args={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="Spell ValeCuatro!"
        />
    )

}
