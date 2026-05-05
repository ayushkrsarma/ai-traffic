import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportTrafficReport = async (stats: any, city: string, lat: number, lon: number, chartImage?: string) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleString();

  // Header
  doc.setFontSize(24);
  doc.setTextColor(30, 41, 59); // zinc-800
  doc.text('Traffic Intelligence & Operations Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // zinc-500
  doc.text(`Report Generated: ${date}`, 14, 30);
  doc.text(`Deployment Node: ${city} | Latitude: ${lat.toFixed(4)} | Longitude: ${lon.toFixed(4)}`, 14, 35);

  // Line
  doc.setDrawColor(226, 232, 240); // zinc-200
  doc.setLineWidth(0.5);
  doc.line(14, 40, 196, 40);

  // Stats Table
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Key Performance Indicators (KPIs)', 14, 50);

  autoTable(doc, {
    startY: 55,
    head: [['Strategic Metric', 'Current Value', 'Variance (Last 1hr)']],
    body: [
      ['Average Traffic Density', stats.trafficDensity, stats.trends.density],
      ['Wait Time Reduction Efficiency', stats.waitTimeReduction, stats.trends.waitTime],
      ['AI Prediction Confidence', stats.aiConfidence, 'Stable'],
      ['Active Roadway Incidents', stats.activeIncidents.toString(), 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' }, // blue-600
    styles: { fontSize: 10, cellPadding: 5 }
  });

  // Traffic Condition Q&A Section
  const qaY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 100;
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text('Traffic Condition Analysis & Assessment', 14, qaY);
  
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  
  // Q1: Is it jam free?
  const densityVal = parseFloat(stats.trafficDensity);
  const isJamFree = densityVal < 40 && stats.activeIncidents === 0 ? "Affirmative. The current traffic flow is optimal and free of significant congestion." : "Negative. Moderate to heavy congestion levels have been detected at this node.";
  doc.setFont('helvetica', 'bold');
  doc.text('1. Current Congestion Status: Is the route free of traffic jams?', 14, qaY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(isJamFree, 20, qaY + 16);

  // Q2: How much time taken in jam?
  const estimatedDelay = Math.round(densityVal * 0.4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('2. Estimated Delay: What is the projected time loss due to current congestion?', 14, qaY + 28);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`The current projected delay is approximately ${estimatedDelay} minutes per 5km interval.`, 20, qaY + 34);

  // Q3: Is traffic safe to drive?
  const isSafe = stats.activeIncidents === 0 && parseFloat(stats.aiConfidence) > 95 ? "Status: Highly Safe. No active incidents detected; system operations are nominal." : "Status: Caution Advised. Real-time alerts suggest monitoring road conditions due to volume/incidents.";
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('3. Safety Assessment: Is the current environment optimal for safe driving?', 14, qaY + 46);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(isSafe, 20, qaY + 52);

  // Visual Data Section (Chart Image)
  if (chartImage) {
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text('Analytical Data Visualization', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Real-time traffic flow trends and AI-projected volume levels.', 14, 28);
    
    // Add the image (assuming it's a data URL from html2canvas)
    doc.addImage(chartImage, 'PNG', 14, 35, 180, 100);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Visual Summary:', 14, 145);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('- Peak volume periods are clearly visible in the data curves above.', 14, 152);
    doc.text('- The system successfully adapted signal timings to flatten the congestion spikes.', 14, 159);
  }

  // Footer (on last page)
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount} | AI Traffic Management System | Digital Twin v1.5`, 14, 285);
  }

  doc.save(`Traffic_Intelligence_Report_${city.replace(/\s+/g, '_')}.pdf`);
};
