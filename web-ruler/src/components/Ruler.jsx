import './Ruler.css'

const CM_PER_INCH = 2.54

function Ruler({ unit, dpi, opacity, screenWidth, screenHeight }) {
  const pxPerUnit = unit === 'cm'
    ? (dpi / CM_PER_INCH)
    : dpi

  const mmPerUnit = unit === 'cm' ? 10 : 25.4

  const renderTicksForEdge = (position) => {
    const length = position === 'top' || position === 'bottom' ? screenWidth : screenHeight
    const ticks = []

    if (unit === 'px') {
      // Iterate over pixels directly
      for (let px = 1; px <= length; px++) {
        let tickHeight
        let showLabel = false
        let label = ''

        if (px % 100 === 0) {
          tickHeight = 30
          showLabel = true
          label = px.toString()
        } else if (px % 50 === 0) {
          tickHeight = 20
        } else {
          tickHeight = 10
        }

        const tick = (position) => {
          switch (position) {
            case 'top':
              return (
                <line x1={px} y1="0" x2={px} y2={tickHeight} stroke="#000" strokeWidth="1.5" />
              )
            case 'bottom':
              return (
                <line x1={px} y1={screenHeight} x2={px} y2={screenHeight - tickHeight} stroke="#000" strokeWidth="1.5" />
              )
            case 'left':
              return (
                <line x1="0" y1={px} x2={tickHeight} y2={px} stroke="#000" strokeWidth="1.5" />
              )
            case 'right':
              return (
                <line x1={screenWidth} y1={px} x2={screenWidth - tickHeight} y2={px} stroke="#000" strokeWidth="1.5" />
              )
          }
        }

        const lbl = (position) => {
          if (!showLabel) return null
          switch (position) {
            case 'top':
              return <text x={px + 4} y={tickHeight + 14} fontSize="12" fontWeight="600" fill="#000" style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}>{label}</text>
            case 'bottom':
              return <text x={px - 4} y={screenHeight - tickHeight - 6} fontSize="12" fontWeight="600" fill="#000" textAnchor="end" style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}>{label}</text>
            case 'left':
              return <text x={tickHeight + 4} y={px + 4} fontSize="12" fontWeight="600" fill="#000" style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}>{label}</text>
            case 'right':
              return <text x={screenWidth - tickHeight - 4} y={px + 4} fontSize="12" fontWeight="600" fill="#000" textAnchor="end" style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}>{label}</text>
          }
        }

        ticks.push(<g key={`tick-${position}-${px}`}>{tick(position)}{lbl(position)}</g>)
      }
    } else {
      // cm or inch: iterate over millimeters
      const totalMm = (length / pxPerUnit) * mmPerUnit

      for (let mm = 1; mm <= totalMm; mm++) {
        const px = (mm / mmPerUnit) * pxPerUnit
        let tickHeight
        let showLabel = false
        let label = ''

        if (mm % mmPerUnit === 0) {
          tickHeight = 30
          showLabel = true
          label = unit === 'cm' ? (mm / 10).toFixed(1) : (mm / 25.4).toFixed(2)
        } else if (mm % (mmPerUnit / 2) === 0) {
          tickHeight = 20
        } else {
          tickHeight = 10
        }

        const tick = (position) => {
          switch (position) {
            case 'top':
              return <line x1={px} y1="0" x2={px} y2={tickHeight} stroke="#000" strokeWidth="1.5" />
            case 'bottom':
              return <line x1={px} y1={screenHeight} x2={px} y2={screenHeight - tickHeight} stroke="#000" strokeWidth="1.5" />
            case 'left':
              return <line x1="0" y1={px} x2={tickHeight} y2={px} stroke="#000" strokeWidth="1.5" />
            case 'right':
              return <line x1={screenWidth} y1={px} x2={screenWidth - tickHeight} y2={px} stroke="#000" strokeWidth="1.5" />
          }
        }

        const lbl = (position) => {
          if (!showLabel) return null
          switch (position) {
            case 'top':
              return <text x={px + 4} y={tickHeight + 14} fontSize="12" fontWeight="600" fill="#000" style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}>{label}</text>
            case 'bottom':
              return <text x={px - 4} y={screenHeight - tickHeight - 6} fontSize="12" fontWeight="600" fill="#000" textAnchor="end" style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}>{label}</text>
            case 'left':
              return <text x={tickHeight + 4} y={px + 4} fontSize="12" fontWeight="600" fill="#000" style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}>{label}</text>
            case 'right':
              return <text x={screenWidth - tickHeight - 4} y={px + 4} fontSize="12" fontWeight="600" fill="#000" textAnchor="end" style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}>{label}</text>
          }
        }

        ticks.push(<g key={`tick-${position}-${mm}`}>{tick(position)}{lbl(position)}</g>)
      }
    }

    return ticks
  }

  return (
    <svg
      className="ruler-edge"
      viewBox={`0 0 ${screenWidth} ${screenHeight}`}
      style={{ opacity }}
    >
      {/* Edge lines */}
      <line x1="0" y1="0" x2={screenWidth} y2="0" stroke="#000" strokeWidth="1.5" />
      <line x1="0" y1={screenHeight} x2={screenWidth} y2={screenHeight} stroke="#000" strokeWidth="1.5" />
      <line x1="0" y1="0" x2="0" y2={screenHeight} stroke="#000" strokeWidth="1.5" />
      <line x1={screenWidth} y1="0" x2={screenWidth} y2={screenHeight} stroke="#000" strokeWidth="1.5" />

      {/* Ticks on all four edges */}
      {renderTicksForEdge('top')}
      {renderTicksForEdge('bottom')}
      {renderTicksForEdge('left')}
      {renderTicksForEdge('right')}
    </svg>
  )
}

export default Ruler
