import { useState, useEffect, useRef } from 'react';

const AlcoholProgressionGraph = ({ managers, beerConsumption, shotConsumption, drinkingStartTime }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [drinkEvents, setDrinkEvents] = useState([]);
  const intervalRef = useRef(null);

  // Calculate blood alcohol content for a given time
  const calculateBACForTime = (beerCount, shots, playerData, startTime, currentTime) => {
    if (!playerData.weight || (beerCount === 0 && (!shots || (shots.shots20 === 0 && shots.shots40 === 0)))) return 0;
    
    // Beer alcohol calculation: 0.5L beer = 500ml * 0.05 (5%) = 25ml pure alcohol
    // Density of ethanol = 0.789g/ml, so 25ml = 19.725g pure alcohol per beer
    const beerAlcoholGrams = beerCount * 25 * 0.789;
    
    // Shot alcohol calculation: 2cl shot = 20ml
    let shotAlcoholGrams = 0;
    if (shots) {
      shotAlcoholGrams = (shots.shots20 * 20 * 0.20 * 0.789) + (shots.shots40 * 20 * 0.40 * 0.789);
    }
    
    const totalAlcoholGrams = beerAlcoholGrams + shotAlcoholGrams;
    
    // Widmark factors (standard clinical values)
    const r = playerData.gender === 'male' ? 0.70 : 0.60;
    
    // Widmark formula: BAC = A / (r × m) where A=alcohol in grams, r=distribution factor, m=weight in kg
    let bac = totalAlcoholGrams / (r * playerData.weight);
    
    // Time-based alcohol elimination (0.15 promille per hour)
    if (startTime && currentTime) {
      const startDate = new Date(startTime);
      const currentDate = new Date(currentTime);
      const hoursElapsed = (currentDate - startDate) / (1000 * 60 * 60);
      const eliminatedBac = hoursElapsed * 0.15;
      bac = Math.max(0, bac - eliminatedBac);
    }
    
    return bac;
  };

  // Track drink events for visual markers
  useEffect(() => {
    if (!drinkingStartTime) return;

    const savedEvents = localStorage.getItem('drinkEvents');
    if (savedEvents) {
      try {
        setDrinkEvents(JSON.parse(savedEvents));
      } catch (e) {
        console.error('Error loading drink events:', e);
      }
    }
  }, [drinkingStartTime]);

  // Track drink consumption changes and add events
  useEffect(() => {
    if (!drinkingStartTime) return;

    const totalAlexander = beerConsumption.alexander + shotConsumption.alexander.shots20 + shotConsumption.alexander.shots40;
    const totalPhilip = beerConsumption.philip + shotConsumption.philip.shots20 + shotConsumption.philip.shots40;
    
    const lastEvent = drinkEvents[drinkEvents.length - 1];
    const currentTime = new Date().toISOString();
    
    if (!lastEvent || 
        lastEvent.alexanderTotal !== totalAlexander || 
        lastEvent.philipTotal !== totalPhilip) {
      
      const newEvent = {
        timestamp: currentTime,
        alexanderTotal: totalAlexander,
        philipTotal: totalPhilip,
        alexanderChange: !lastEvent ? totalAlexander : totalAlexander - lastEvent.alexanderTotal,
        philipChange: !lastEvent ? totalPhilip : totalPhilip - lastEvent.philipTotal,
        beers: { alexander: beerConsumption.alexander, philip: beerConsumption.philip },
        shots: { 
          alexander: shotConsumption.alexander, 
          philip: shotConsumption.philip 
        }
      };
      
      const updatedEvents = [...drinkEvents, newEvent];
      setDrinkEvents(updatedEvents);
      localStorage.setItem('drinkEvents', JSON.stringify(updatedEvents));
    }
  }, [beerConsumption, shotConsumption, drinkingStartTime, drinkEvents]);

  // Generate historical data points with real-time updates
  useEffect(() => {
    if (!drinkingStartTime) {
      setHistoricalData([]);
      return;
    }

    const updateData = () => {
      const startTime = new Date(drinkingStartTime);
      const now = new Date();
      const data = [];
      
      // Generate data points every 5 minutes for more granular tracking
      const intervalMinutes = 5;
      const totalMinutes = Math.ceil((now - startTime) / (1000 * 60));
      const dataPoints = Math.min(Math.ceil(totalMinutes / intervalMinutes), 144); // Max 144 points (12 hours)
      
      for (let i = 0; i <= dataPoints; i++) {
        const currentTime = new Date(startTime.getTime() + (i * intervalMinutes * 60 * 1000));
        
        const alexanderBAC = calculateBACForTime(
          beerConsumption.alexander,
          shotConsumption.alexander,
          { weight: managers.aek.weight, gender: 'male' },
          drinkingStartTime,
          currentTime.toISOString()
        );
        
        const philipBAC = calculateBACForTime(
          beerConsumption.philip,
          shotConsumption.philip,
          { weight: managers.real.weight, gender: 'male' },
          drinkingStartTime,
          currentTime.toISOString()
        );
        
        data.push({
          time: currentTime,
          timeLabel: currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
          alexander: alexanderBAC,
          philip: philipBAC
        });
      }
      
      setHistoricalData(data);
    };

    // Initial update
    updateData();

    // Update every minute for real-time tracking
    intervalRef.current = setInterval(updateData, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [drinkingStartTime, beerConsumption, shotConsumption, managers]);

  const maxBAC = Math.max(
    ...historicalData.map(d => Math.max(d.alexander, d.philip)),
    1.0 // Minimum scale of 1.0‰
  );

  const getColorForBAC = (bac) => {
    if (bac >= 1.0) return 'text-red-500';
    if (bac >= 0.5) return 'text-orange-500';
    if (bac >= 0.3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const SVGGraph = () => {
    // Enhanced responsive dimensions for better mobile experience
    const isMobile = window.innerWidth < 768;
    const width = isMobile ? Math.min(window.innerWidth - 32, 450) : 900;
    const height = isMobile ? 280 : 400;
    const margin = isMobile 
      ? { top: 35, right: 45, bottom: 55, left: 45 }
      : { top: 40, right: 100, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    if (historicalData.length === 0) {
      return (
        <div className="flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300" 
             style={{ width: `${width}px`, height: `${height}px` }}>
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Keine Daten zum Anzeigen</p>
            <p className="text-sm">Trinken starten, um den Verlauf zu sehen</p>
          </div>
        </div>
      );
    }

    // Calculate scales
    const xScale = (index) => (index / (historicalData.length - 1)) * chartWidth;
    const yScale = (bac) => chartHeight - (bac / maxBAC) * chartHeight;

    // Generate path data with smooth curves
    const createSmoothPath = (data, accessor) => {
      if (data.length === 0) return '';
      
      const points = data.map((d, i) => ({
        x: xScale(i),
        y: yScale(accessor(d))
      }));
      
      let path = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
        const cpy1 = prev.y;
        const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
        const cpy2 = curr.y;
        
        path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
      }
      
      return path;
    };

    const alexanderPath = createSmoothPath(historicalData, d => d.alexander);
    const philipPath = createSmoothPath(historicalData, d => d.philip);

    // Generate grid lines
    const yGridLines = [];
    const gridSteps = [0.3, 0.5, 1.0, 1.5, 2.0];
    gridSteps.forEach(step => {
      if (step <= maxBAC) {
        yGridLines.push(
          <g key={step}>
            <line
              x1={0}
              y1={yScale(step)}
              x2={chartWidth}
              y2={yScale(step)}
              stroke={step === 0.5 ? '#f59e0b' : step === 1.0 ? '#ef4444' : '#e5e7eb'}
              strokeWidth={step === 0.5 || step === 1.0 ? 2 : 1}
              strokeDasharray={step === 0.5 || step === 1.0 ? '5,5' : 'none'}
            />
            <text
              x={-10}
              y={yScale(step) + 4}
              textAnchor="end"
              fontSize="12"
              fill={step === 0.5 ? '#d97706' : step === 1.0 ? '#dc2626' : '#6b7280'}
              className="font-medium"
            >
              {step.toFixed(1)}‰
            </text>
          </g>
        );
      }
    });

    // Time markers (every hour)
    const timeMarkers = [];
    const startTime = new Date(drinkingStartTime);
    historicalData.forEach((d, i) => {
      const diffMinutes = (d.time - startTime) / (1000 * 60);
      if (diffMinutes % 60 === 0 && i < historicalData.length - 1) {
        timeMarkers.push(
          <g key={i}>
            <line
              x1={xScale(i)}
              y1={0}
              x2={xScale(i)}
              y2={chartHeight}
              stroke="#d1d5db"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <text
              x={xScale(i)}
              y={chartHeight + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {d.timeLabel}
            </text>
          </g>
        );
      }
    });

    // Drink event markers
    const drinkMarkers = drinkEvents.map((event, i) => {
      const eventTime = new Date(event.timestamp);
      const startTime = new Date(drinkingStartTime);
      const minutesSinceStart = (eventTime - startTime) / (1000 * 60);
      const dataIndex = Math.round(minutesSinceStart / 5); // 5-minute intervals
      
      if (dataIndex >= 0 && dataIndex < historicalData.length) {
        const x = xScale(dataIndex);
        
        // Determine icon based on drink type
        const hasBeers = (event.alexanderChange > 0 && event.beers) || (event.philipChange > 0 && event.beers);
        const hasShots = (event.shots?.alexander?.shots20 > 0) || (event.shots?.alexander?.shots40 > 0) || 
                        (event.shots?.philip?.shots20 > 0) || (event.shots?.philip?.shots40 > 0);
        
        let icon = '🍺'; // Default beer
        let iconColor = '#8b5cf6';
        
        if (hasShots && !hasBeers) {
          icon = '🥃';
          iconColor = '#f59e0b';
        } else if (hasShots && hasBeers) {
          icon = '🍻';
          iconColor = '#10b981';
        }
        
        return (
          <g key={i}>
            {/* Event marker line */}
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={chartHeight}
              stroke={iconColor}
              strokeWidth={isMobile ? "1.5" : "2"}
              strokeDasharray="4,2"
              opacity="0.7"
            />
            {/* Drink icon background */}
            <circle
              cx={x}
              cy={-15}
              r={isMobile ? "8" : "10"}
              fill={iconColor}
              stroke="white"
              strokeWidth={isMobile ? "2" : "3"}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
              }}
            />
            {/* Drink icon */}
            <text
              x={x}
              y={isMobile ? "-10" : "-7"}
              textAnchor="middle"
              fontSize={isMobile ? "11" : "13"}
              fill="white"
              className="font-bold"
              style={{
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))'
              }}
            >
              {icon}
            </text>
          </g>
        );
      }
      return null;
    });

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-4 overflow-x-auto">
        <svg width={width} height={height} className="overflow-visible mx-auto block"
             viewBox={isMobile ? `0 0 ${width} ${height}` : undefined}
             style={isMobile ? { maxWidth: '100%', height: 'auto' } : {}}>
          {/* Background gradient */}
          <defs>
            <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>
            
            {/* Glow effects for lines */}
            <filter id="alexanderGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            <filter id="philipGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Chart background */}
          <rect 
            x={margin.left} 
            y={margin.top} 
            width={chartWidth} 
            height={chartHeight} 
            fill="url(#backgroundGradient)"
            rx="8"
          />

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid lines */}
            {yGridLines}
            {timeMarkers}
            
            {/* Danger zones */}
            <defs>
              <pattern id="warningZone" patternUnits="userSpaceOnUse" width="4" height="4">
                <rect width="4" height="4" fill="#fef3c7"/>
                <path d="M 0,2 L 2,0 M 2,4 L 4,2" stroke="#f59e0b" strokeWidth="0.3"/>
              </pattern>
              <pattern id="dangerZone" patternUnits="userSpaceOnUse" width="4" height="4">
                <rect width="4" height="4" fill="#fee2e2"/>
                <path d="M 0,2 L 2,0 M 2,4 L 4,2" stroke="#ef4444" strokeWidth="0.3"/>
              </pattern>
            </defs>
            
            {/* Warning zone (0.5-1.0‰) */}
            {maxBAC > 0.5 && (
              <rect 
                x={0} 
                y={yScale(Math.min(1.0, maxBAC))} 
                width={chartWidth} 
                height={yScale(0.5) - yScale(Math.min(1.0, maxBAC))} 
                fill="url(#warningZone)" 
                opacity="0.4"
              />
            )}
            
            {/* Danger zone (>1.0‰) */}
            {maxBAC > 1.0 && (
              <rect 
                x={0} 
                y={0} 
                width={chartWidth} 
                height={yScale(1.0)} 
                fill="url(#dangerZone)" 
                opacity="0.4"
              />
            )}
            
            {/* Drink event markers */}
            {drinkMarkers}
            
            {/* Time labels */}
            {historicalData.filter((d, i) => i % Math.ceil(historicalData.length / 8) === 0).map((d, i) => (
              <text
                key={i}
                x={xScale(i * Math.ceil(historicalData.length / 8))} 
                y={chartHeight + 35} 
                textAnchor="middle" 
                fontSize="11" 
                fill="#6b7280"
                className="font-medium"
              >
                {d.timeLabel}
              </text>
            ))}
            
            {/* Alexander's line (blue with glow) */}
            <path 
              d={alexanderPath} 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#alexanderGlow)"
              opacity="0.9"
            />
            
            {/* Philip's line (green with glow) */}
            <path 
              d={philipPath} 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#philipGlow)"
              opacity="0.9"
            />
            
            {/* Enhanced data points */}
            {historicalData.map((d, i) => {
              if (i % 3 !== 0 && i !== historicalData.length - 1) return null; // Show every 3rd point + last
              
              return (
                <g key={i}>
                  {/* Alexander points */}
                  <circle 
                    cx={xScale(i)} 
                    cy={yScale(d.alexander)} 
                    r="6" 
                    fill="#3b82f6"
                    stroke="white"
                    strokeWidth="3"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
                    }}
                  />
                  {/* Philip points */}
                  <circle 
                    cx={xScale(i)} 
                    cy={yScale(d.philip)} 
                    r="6" 
                    fill="#10b981"
                    stroke="white"
                    strokeWidth="3"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))'
                    }}
                  />
                </g>
              );
            })}
          </g>
          
          {/* Enhanced Legend */}
          {!isMobile && (
            <g transform={`translate(${width - margin.right + 15}, ${margin.top + 20})`}>
              <rect x={-10} y={-15} width={85} height={110} fill="white" stroke="#e5e7eb" strokeWidth="2" rx="8" style={{
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
              }}/>
              <text x={30} y={-5} textAnchor="middle" fontSize="12" fill="#374151" className="font-bold">Legende</text>
              <line x1={5} y1={10} x2={20} y2={10} stroke="#3b82f6" strokeWidth="4"/>
              <text x={25} y={14} fontSize="11" fill="#374151" className="font-medium">Alexander</text>
              <line x1={5} y1={30} x2={20} y2={30} stroke="#10b981" strokeWidth="4"/>
              <text x={25} y={34} fontSize="11" fill="#374151" className="font-medium">Philip</text>
              <line x1={5} y1={50} x2={20} y2={50} stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4,2"/>
              <text x={25} y={54} fontSize="11" fill="#374151" className="font-medium">🍺 Bier</text>
              <line x1={5} y1={70} x2={20} y2={70} stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2"/>
              <text x={25} y={74} fontSize="11" fill="#374151" className="font-medium">🥃 Shots</text>
              <line x1={5} y1={90} x2={20} y2={90} stroke="#10b981" strokeWidth="2" strokeDasharray="4,2"/>
              <text x={25} y={94} fontSize="11" fill="#374151" className="font-medium">🍻 Mix</text>
            </g>
          )}
        </svg>
        
        {/* Enhanced Mobile Legend */}
        {isMobile && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2 text-center">Legende</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 justify-center">
                <div className="w-5 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Alexander</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <div className="w-5 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Philip</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-lg">🍺</span>
                <span className="text-sm">Bier</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-lg">🥃</span>
                <span className="text-sm">Shots</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!drinkingStartTime) {
    return null;
  }

  return (
    <div className="modern-card mt-6">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-bold text-lg text-text-primary">
          📈 Alkoholverlauf beider Manager
        </h3>
        <div className="flex items-center gap-2">
          {/* Current BAC indicators */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Alexander: </span>
              <span className={`font-bold ${getColorForBAC(historicalData[historicalData.length - 1]?.alexander || 0)}`}>
                {(historicalData[historicalData.length - 1]?.alexander || 0).toFixed(2)}‰
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Philip: </span>
              <span className={`font-bold ${getColorForBAC(historicalData[historicalData.length - 1]?.philip || 0)}`}>
                {(historicalData[historicalData.length - 1]?.philip || 0).toFixed(2)}‰
              </span>
            </div>
          </div>
          <button className="text-2xl transition-transform duration-200">
            {isExpanded ? '📉' : '📊'}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4">
          <div className="mb-4 text-sm text-text-muted">
            BAK-Verlauf seit Trinkbeginn ({new Date(drinkingStartTime).toLocaleTimeString('de-DE', { 
              hour: '2-digit', 
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit'
            })})
          </div>
          
          <SVGGraph />
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 mb-1">⚠️ Grenzwerte</div>
              <div className="text-yellow-700 space-y-1">
                <div>0,3‰: Reaktionszeit verlangsamt</div>
                <div>0,5‰: Fahruntüchtig</div>
                <div>1,0‰: Schwer betrunken</div>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-800 mb-1">🔵 Alexander aktuell</div>
              <div className="text-blue-700">
                <div>Gewicht: {managers.aek.weight}kg</div>
                <div>Biere: {beerConsumption.alexander}</div>
                <div>Shots: {shotConsumption.alexander.shots20 + shotConsumption.alexander.shots40}</div>
              </div>
            </div>
            
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 mb-1">🟢 Philip aktuell</div>
              <div className="text-green-700">
                <div>Gewicht: {managers.real.weight}kg</div>
                <div>Biere: {beerConsumption.philip}</div>
                <div>Shots: {shotConsumption.philip.shots20 + shotConsumption.philip.shots40}</div>
              </div>
            </div>
          </div>

          {/* Enhanced Drink Events Timeline with Icons */}
          {drinkEvents.length > 0 && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                <span className="text-lg">🍺</span>
                <span>Getränke-Timeline (letzte 5)</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                {drinkEvents.slice(-5).reverse().map((event, i) => {
                  // Determine what drinks were consumed
                  const alexanderBeers = event.beers?.alexander || 0;
                  const philipBeers = event.beers?.philip || 0;
                  const alexanderShots = (event.shots?.alexander?.shots20 || 0) + (event.shots?.alexander?.shots40 || 0);
                  const philipShots = (event.shots?.philip?.shots20 || 0) + (event.shots?.philip?.shots40 || 0);
                  
                  return (
                    <div key={i} className="flex justify-between items-center p-2 bg-white rounded-md border border-purple-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-600 font-mono">
                          {new Date(event.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Alexander's drinks */}
                        {event.alexanderChange > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-blue-600 font-medium">Alex:</span>
                            {alexanderBeers > 0 && (
                              <span className="flex items-center text-sm">
                                🍺<span className="text-xs text-blue-600 ml-0.5">+{event.alexanderChange}</span>
                              </span>
                            )}
                            {alexanderShots > 0 && (
                              <span className="flex items-center text-sm">
                                🥃<span className="text-xs text-blue-600 ml-0.5">+{event.alexanderChange}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {/* Philip's drinks */}
                        {event.philipChange > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-green-600 font-medium">Phil:</span>
                            {philipBeers > 0 && (
                              <span className="flex items-center text-sm">
                                🍺<span className="text-xs text-green-600 ml-0.5">+{event.philipChange}</span>
                              </span>
                            )}
                            {philipShots > 0 && (
                              <span className="flex items-center text-sm">
                                🥃<span className="text-xs text-green-600 ml-0.5">+{event.philipChange}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlcoholProgressionGraph;