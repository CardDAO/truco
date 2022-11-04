import { useEffect } from 'react'

export const useProcessMessage = (messages) => {
    useEffect(() => {
        if (messages.length > 0) {
            console.log(messages)
        }
    }, [messages])
}
