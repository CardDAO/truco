
const DECK_PATH =  '/deck_images'
export const GraphicCard = ({cardIndex}) => {
    return (
        <div>
            {
                cardIndex === 0 ?
                    <img src={`${DECK_PATH}/hidden.png`} />
                    :
                    <img src={`${DECK_PATH}/${cardIndex}.png`} />
            }
        </div>
    )

}
