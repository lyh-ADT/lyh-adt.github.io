import './Ruler.css'

const CM_PER_INCH = 2.54
const TICK_MAJOR = 10  // mm
const TICK_MEDIUM = 5
const TICK_MINOR = 1

function Ruler({ position, unit, dpi, opacity, screenWidth, screenHeight }) {
  const isHorizontal = position === 'top' || position === 'bottom'
  const length = isHorizontal ? screenWidth : screenHeight
  
  const pxPerUnit = unit === 'cm' 
    ? (dpi / CM_PER_INCH) 
    : dpi

  const displayLength = Math.round(length / pxPerUnit * 10) / 10

  const renderTicks = () => {
    const ticks = []
    const mmPerUnit = unit === 'cm' ? 10 : 25.4
    const totalMm = (length / pxPerUnit) * mmPerUnit
    
    for (let mm = 0; mm <= totalMm; mm++) {
      const px = (mm / mmPerUnit) * pxPerUnit
      let tickHeight = 8
      let showLabel = false
      let label = ''

      if (mm % TICK_MAJOR === 0 && mm !== 0) {
        tickHeight = 30
        showLabel = true
        if (unit === 'cm') {
          label = (mm / 10).toFixed(1)
        } else if (unit === 'inch') {
          label = (mm / 25.4).toFixed(2)
        } else {
          label = Math.round(px)
        }
      } else if (mm % TICK_MEDIUM === 0) {
        tickHeight = 20
      } else {
        tickHeight = 10
      }

      if (isHorizontal) {
        const yPos = position === 'top' ? 0 : '100%'
        const tickDirection = position === 'top' ? 1 : -1
        
        ticks.push(
          <g key={mm}>
            <line
              x1={px}
              y1={position === 'top' ? 0 : 60}
              x2={px}
              y2={position === 'top' ? tickHeight : 60 - tickHeight}
              stroke="#000"
              strokeWidth="1.5"
            />
            {showLabel && (
              <text
                x={px + 4}
                y={position === 'top' ? tickHeight + 14 : 60 - tickHeight - 6}
                fontSize="12"
                fontWeight="600"
                fill="#000"
                style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}
              >
                {label}
              </text>
            )}
          </g>
        )
      } else {
        ticks.push(
          <g key={mm}>
            <line
              x1={position === 'left' ? 60 : 0}
              y1={px}
              x2={position === 'left' ? 60 - tickHeight : tickHeight}
              y2={px}
              stroke="#000"
              strokeWidth="1.5"
            />
            {showLabel && (
              <text
                x={position === 'left' ? 60 - tickHeight - 4 : tickHeight + 4}
                y={px + 4}
                fontSize="12"
                fontWeight="600"
                fill="#000"
                textAnchor={position === 'left' ? 'end' : 'start'}
                style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}
              >
                {label}
              </text>
            )}
          </g>
        )
      }
    }
    return ticks
  }

  return (
    <div
      className={`ruler ruler-full ${position}`}
      style={{ opacity }}
    >
      <svg 
        width={isHorizontal ? '100%' : '60px'} 
        height={isHorizontal ? '60px' : '100%'}
      >
        {renderTicks()}
      </svg>
      <div className={`ruler-label ${position}`}>
        {displayLength} {unit}
      </div>
    </div>
  )
}

export default Ruler
