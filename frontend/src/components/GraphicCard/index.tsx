
const DECK_PATH =  '/deck_images'
const CARD_STYLE = 'inline object-cover h-40'
export const GraphicCard = ({cardIndex}) => {
    return (
        <img className={CARD_STYLE} src={`${DECK_PATH}/${cardIndex === 0 ? 'reverse-card' : cardIndex}.png`} />
    )

}
