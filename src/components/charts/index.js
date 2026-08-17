// D3-Diagramme.
//
// Hier standen einmal vier. Drei davon (TrendLineChart, PlayerBarChart,
// WinDistributionChart) hatte niemand mehr eingebunden — sie sind zusammen
// 627 Zeilen mitgeschleppt worden, ohne je gerendert zu werden. Entfernt.
//
// Das verbliebene Diagramm ist der einzige Grund, warum die acht
// d3-Abhaengigkeiten noch im Projekt sind.
export { default as GoalTrendAreaChart } from './GoalTrendAreaChart';
