
export const GraphicCard = ({cardIndex}) => {

    if (cardIndex === 0) {
        return (<div><img src={`/cards/1.jpg`} /></div>)
    }
    return (
        <div>
            {
                cardIndex === 0 ?
                    <img src={`/cards/hidden.png`} />
                    :
                    <img src={`/cards/${cardIndex}.png`} />
            }
        </div>
    )

}
