import { useState, useEffect } from "react"
import { BigNumber } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useContractRead, useContractWrite, usePrepareContractWrite } from "wagmi"
import { ActionButton } from "../Button"
import { GAS_LIMIT_WRITE } from "../../Dashboard"
import {utils} from 'ethers'

export const RecalculateEnvido = ({ cards, setCurrentEnvido }: any) => {

    const [ goToSpell, setGoToSpell] = useState(false)
    const [ enableAction, setEnableAction ] = useState(false)

    const { data, isError, isLoading } = useContractRead({
      addressOrName: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      contractInterface: new Interface(["function getEnvidoPointsForCards(uint8[]) public view returns(uint)"]),
      functionName: 'getEnvidoPointsForCards',
      args: [cards],
      enabled: goToSpell,
      onSuccess: (data) => {
          console.log('recalculate envido', data)
          setCurrentEnvido(BigNumber.from(data).toNumber())
          setGoToSpell(false)
      },
      onError: (error: Error) => {
          console.log('erorr recalculate ', error)
          setGoToSpell(false)
      }
    })

    return (
        <>
                <ActionButton clickCallback={() => {
                    setGoToSpell(true) 
                }} text="Recalculate Envido" isWrite={false} />
        </>
    )
}
