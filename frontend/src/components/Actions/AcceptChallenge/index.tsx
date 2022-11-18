import { useState, useEffect } from "react"
import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { CommonActionWrite } from "../CommonActionWrite"

export const AcceptChallenge = ({match, processingAction, setProcessingAction}: any) => {

    return (
        <CommonActionWrite
            match={match}
            writeSelectorInterface={new Interface(["function acceptChallenge() public"])}
            writeFunctionName={"acceptChallenge"}
            writeArgs={[]}
            processingAction={processingAction}
            setProcessingAction={setProcessingAction}
            buttonText="AcceptChallenge!"
        />
    )
}
