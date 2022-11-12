import { useCallback, useState, useEffect } from 'react'

export const useProcessMessage = ({ messages, onNewMessage}: any) => {
    const [lastIndexProcessed, setLastIndexProcessed] = useState(-1)

    const callbackMessage = useCallback((messageToProcess: MessageType) => {
            onNewMessage(messageToProcess)
    }, [onNewMessage])

    useEffect(() => {
        if(messages.length > 0 && messages.length > (lastIndexProcessed+1)) {
            const indexToProcess = lastIndexProcessed + 1
            const messageToProcess = messages[indexToProcess]
            setLastIndexProcessed(indexToProcess)
            callbackMessage(messageToProcess)
        }
    }, [messages])
}
