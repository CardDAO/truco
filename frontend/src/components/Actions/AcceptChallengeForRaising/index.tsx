import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const AcceptChallengeForRaising = ({match, processingAction, setProcessingAction}: any) => {
    return (
        <CommonActionWrite
            match={match}
            contractInterface={new Interface(["function acceptChallengeForRaising() public"])}
            functionName={"acceptChallengeForRaising"}
            args={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="AcceptChallengeForRaising!"
        />
    )
}
