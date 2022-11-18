import { useState, useEffect } from "react"
import { useContractRead, useContractWrite, usePrepareContractWrite } from "wagmi"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"
import { useAccountInformation } from "../../../hooks/providers/Wagmi"

export const CommonActionWrite = ({
    writeSelectorInterface, writeFunctionName, writeArgs,
    canFunctionName, canSelectorInterface, canFunctionArgs, canContractAddress,
    checkExecute = false,
    buttonText, match, processingAction, setProcessingAction }: any
) => {

    const [ goToSpell, setGoToSpell] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)
    const [ canActionSuccess, setCanActionSuccess ] = useState(false)
    const { address } = useAccountInformation()
    //function canSpellTruco(TrucoMatch _contractMatch)

    const {refetch: checkRefetch} = useContractRead({
       addressOrName: canContractAddress,
       contractInterface: canSelectorInterface,
       functionName: canFunctionName,
       enabled: checkExecute,
       args: canFunctionArgs,
       overrides: {
           from: address
       },
       onSuccess: (data) => {
           if (data) {
               setCanActionSuccess(true)
           }
       },
       onError: (error: Error) => {
           setCanActionSuccess(false)
       }
    })

    useEffect(() => {
        if (checkExecute) {
            checkRefetch()
        }
    }, [checkExecute])


    const { refetch, config } = usePrepareContractWrite({
        addressOrName: match, // match
        contractInterface: writeSelectorInterface,
        functionName: writeFunctionName,
        args: writeArgs,
        overrides: {
            gasLimit: GAS_LIMIT_WRITE
        },
        onSuccess: (data) => {
            if (canActionSuccess) {
                console.log(`can ${writeFunctionName} (TRUE)`, data)
                setEnableAction(true)
            }
        },
        onError: (err: Error) => {
            console.log(`can't ${writeFunctionName} (FALSE)`, err)
            setEnableAction(false)
        }
    })

    useEffect(() => {
        if (canActionSuccess) {
            refetch()
        }
    }, [canActionSuccess])

    const { write, error, isLoading, data }= useContractWrite(config)

    useEffect(() => {
        if (error && goToSpell) {
            setGoToSpell(false)
            setProcessingAction(false)
        }
    }, [ error, goToSpell ])

    return (
        <>
        {
            enableAction ?
                    <ActionButton clickCallback={() => {
                        setGoToSpell(true) 
                        setProcessingAction(true)
                        write?.()
                    }} text={buttonText} />
            : ""
        }
        </>
    )
}
