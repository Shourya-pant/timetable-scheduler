import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface TimetableData {
  id: number;
  name: string;
  department: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledSlot {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_name?: string;
  section_code?: string;
  teacher_name?: string;
  room_id?: string;
}

export interface ExportOptions {
  format: 'pdf';
  orientation: 'portrait' | 'landscape';
  includeCalendar: boolean;
  includeDetails: boolean;
  includeSummary: boolean;
  pageSize: 'a4' | 'a3' | 'letter';
}

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'pdf',
  orientation: 'landscape',
  includeCalendar: true,
  includeDetails: true,
  includeSummary: true,
  pageSize: 'a4'
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const hour = 8 + Math.floor((i * 55) / 60);
  const minute = (i * 55) % 60;
  return {
    index: i,
    time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    label: `${hour > 12 ? hour - 12 : hour === 12 ? 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
  };
});

export class PDFExporter {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margins = { top: 20, right: 20, bottom: 20, left: 20 };
  private currentY = 0;
  private lineHeight = 6;

  constructor(options: Partial<ExportOptions> = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    this.pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.pageSize
    });

    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.currentY = this.margins.top;
  }

  async exportTimetable(
    timetable: TimetableData,
    scheduledSlots: ScheduledSlot[],
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
      // Add title page
      this.addTitlePage(timetable);

      // Add summary if requested
      if (opts.includeSummary) {
        this.addSummaryPage(timetable, scheduledSlots);
      }

      // Add calendar view if requested
      if (opts.includeCalendar) {
        await this.addCalendarPage(scheduledSlots);
      }

      // Add detailed schedule if requested
      if (opts.includeDetails) {
        this.addDetailsPage(scheduledSlots);
      }

      // Generate filename and save
      const filename = this.generateFilename(timetable);
      this.pdf.save(filename);

    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw new Error('Failed to export PDF');
    }
  }

  private addTitlePage(timetable: TimetableData): void {
    // Title
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    const titleText = timetable.name;
    const titleWidth = this.pdf.getTextWidth(titleText);
    const titleX = (this.pageWidth - titleWidth) / 2;
    this.pdf.text(titleText, titleX, this.currentY + 20);

    // Subtitle
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'normal');
    const subtitleText = `${timetable.department} Department`;
    const subtitleWidth = this.pdf.getTextWidth(subtitleText);
    const subtitleX = (this.pageWidth - subtitleWidth) / 2;
    this.pdf.text(subtitleText, subtitleX, this.currentY + 35);

    // Metadata
    this.pdf.setFontSize(12);
    this.currentY += 60;
    
    const metadata = [
      `Status: ${timetable.status.charAt(0).toUpperCase() + timetable.status.slice(1)}`,
      `Created: ${new Date(timetable.created_at).toLocaleDateString()}`,
      `Last Updated: ${new Date(timetable.updated_at).toLocaleDateString()}`,
      `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
    ];

    metadata.forEach(text => {
      this.pdf.text(text, this.margins.left + 20, this.currentY);
      this.currentY += this.lineHeight + 2;
    });

    // Add decorative line
    this.currentY += 10;
    this.pdf.setDrawColor(59, 130, 246); // Primary blue
    this.pdf.setLineWidth(1);
    this.pdf.line(this.margins.left, this.currentY, this.pageWidth - this.margins.right, this.currentY);
  }

  private addSummaryPage(timetable: TimetableData, scheduledSlots: ScheduledSlot[]): void {
    this.addNewPage();
    this.addSectionTitle('Schedule Summary');

    // Statistics
    const stats = this.calculateStatistics(scheduledSlots);
    
    this.pdf.setFontSize(12);
    const statsData = [
      ['Total Scheduled Sessions', stats.totalSessions.toString()],
      ['Unique Courses', stats.uniqueCourses.toString()],
      ['Unique Teachers', stats.uniqueTeachers.toString()],
      ['Unique Sections', stats.uniqueSections.toString()],
      ['Unique Rooms', stats.uniqueRooms.toString()],
      ['Peak Day', `${DAYS[stats.peakDay]} (${stats.peakDaySessions} sessions)`],
      ['Average Sessions per Day', stats.avgSessionsPerDay.toFixed(1)]
    ];

    // Create statistics table
    const startY = this.currentY + 10;
    const colWidth = (this.pageWidth - this.margins.left - this.margins.right) / 2;
    
    statsData.forEach((row, index) => {
      const y = startY + (index * 8);
      this.pdf.text(row[0] + ':', this.margins.left, y);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(row[1], this.margins.left + colWidth, y);
      this.pdf.setFont('helvetica', 'normal');
    });

    this.currentY = startY + (statsData.length * 8) + 20;

    // Add daily distribution chart (text-based)
    this.addSubsectionTitle('Daily Session Distribution');
    const dailyStats = this.getDailyStatistics(scheduledSlots);
    
    dailyStats.forEach(day => {
      const barLength = Math.max(1, (day.sessions / stats.peakDaySessions) * 30);
      const bar = '█'.repeat(Math.floor(barLength));
      
      this.pdf.text(`${day.name}:`, this.margins.left, this.currentY);
      this.pdf.text(bar, this.margins.left + 30, this.currentY);
      this.pdf.text(`${day.sessions}`, this.margins.left + 65, this.currentY);
      this.currentY += 6;
    });
  }

  private async addCalendarPage(scheduledSlots: ScheduledSlot[]): Promise<void> {
    this.addNewPage();
    this.addSectionTitle('Weekly Calendar View');

    // Try to capture calendar from DOM if available
    const calendarElement = document.getElementById('calendar-grid');
    
    if (calendarElement) {
      try {
        const canvas = await html2canvas(calendarElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = this.pageWidth - this.margins.left - this.margins.right;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if image fits on current page
        if (this.currentY + imgHeight > this.pageHeight - this.margins.bottom) {
          this.addNewPage();
        }
        
        this.pdf.addImage(imgData, 'PNG', this.margins.left, this.currentY, imgWidth, imgHeight);
        this.currentY += imgHeight + 10;
        
      } catch (error) {
        console.error('Failed to capture calendar element:', error);
        // Fallback to text-based calendar
        this.addTextCalendar(scheduledSlots);
      }
    } else {
      // Create text-based calendar
      this.addTextCalendar(scheduledSlots);
    }
  }

  private addTextCalendar(scheduledSlots: ScheduledSlot[]): void {
    this.pdf.setFontSize(8);
    
    // Create grid
    const cellWidth = (this.pageWidth - this.margins.left - this.margins.right - 30) / 5;
    const cellHeight = 12;
    const headerHeight = 8;

    // Headers
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Time', this.margins.left, this.currentY + headerHeight);
    
    DAYS.forEach((day, index) => {
      const x = this.margins.left + 30 + (index * cellWidth);
      this.pdf.text(day, x + 2, this.currentY + headerHeight);
    });

    this.currentY += headerHeight + 2;
    this.pdf.setFont('helvetica', 'normal');

    // Create slot grid
    const slotGrid: { [key: string]: ScheduledSlot[] } = {};
    scheduledSlots.forEach(slot => {
      const timeSlot = this.getTimeSlotIndex(slot.start_time);
      const key = `${slot.day_of_week}-${timeSlot}`;
      if (!slotGrid[key]) {
        slotGrid[key] = [];
      }
      slotGrid[key].push(slot);
    });

    // Draw time slots
    TIME_SLOTS.forEach((timeSlot, slotIndex) => {
      const y = this.currentY + (slotIndex * cellHeight);
      
      // Time label
      this.pdf.text(timeSlot.label, this.margins.left, y + 8);
      
      // Day cells
      DAYS.forEach((_, dayIndex) => {
        const x = this.margins.left + 30 + (dayIndex * cellWidth);
        const key = `${dayIndex}-${slotIndex}`;
        const slotsInCell = slotGrid[key] || [];
        
        // Draw cell border
        this.pdf.rect(x, y, cellWidth, cellHeight);
        
        // Add slot content
        if (slotsInCell.length > 0) {
          const slot = slotsInCell[0]; // Take first slot if multiple
          const courseText = slot.course_name?.substring(0, 12) || '';
          const sectionText = slot.section_code || '';
          
          this.pdf.setFontSize(6);
          this.pdf.text(courseText, x + 1, y + 4);
          this.pdf.text(sectionText, x + 1, y + 8);
          this.pdf.setFontSize(8);
        }
      });
    });

    this.currentY += TIME_SLOTS.length * cellHeight + 10;
  }

  private addDetailsPage(scheduledSlots: ScheduledSlot[]): void {
    this.addNewPage();
    this.addSectionTitle('Detailed Schedule');

    // Group by sections
    const sectionGroups = this.groupSlotsBySection(scheduledSlots);
    
    Object.entries(sectionGroups).forEach(([sectionCode, slots]) => {
      // Check page space
      if (this.currentY > this.pageHeight - 60) {
        this.addNewPage();
      }

      this.addSubsectionTitle(`Section ${sectionCode}`);
      
      // Create table header
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'bold');
      
      const headers = ['Course', 'Teacher', 'Day', 'Time', 'Room'];
      const colWidths = [50, 40, 25, 30, 25];
      let x = this.margins.left;
      
      headers.forEach((header, index) => {
        this.pdf.text(header, x + 2, this.currentY);
        x += colWidths[index];
      });
      
      this.currentY += 6;
      
      // Draw header line
      this.pdf.line(this.margins.left, this.currentY, this.margins.left + colWidths.reduce((a, b) => a + b, 0), this.currentY);
      this.currentY += 4;
      
      // Add data rows
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(9);
      
      slots.forEach(slot => {
        if (this.currentY > this.pageHeight - 20) {
          this.addNewPage();
        }
        
        x = this.margins.left;
        const rowData = [
          slot.course_name || '',
          slot.teacher_name || '',
          DAYS[slot.day_of_week] || '',
          `${slot.start_time}-${slot.end_time}`,
          slot.room_id || ''
        ];
        
        rowData.forEach((data, index) => {
          const truncated = data.length > 15 ? data.substring(0, 12) + '...' : data;
          this.pdf.text(truncated, x + 2, this.currentY);
          x += colWidths[index];
        });
        
        this.currentY += 5;
      });
      
      this.currentY += 10;
    });
  }

  private addNewPage(): void {
    this.pdf.addPage();
    this.currentY = this.margins.top;
  }

  private addSectionTitle(title: string): void {
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(title, this.margins.left, this.currentY);
    this.currentY += 12;
    
    // Add underline
    this.pdf.setDrawColor(59, 130, 246);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margins.left, this.currentY, this.margins.left + 60, this.currentY);
    this.currentY += 8;
    
    this.pdf.setFont('helvetica', 'normal');
  }

  private addSubsectionTitle(title: string): void {
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(title, this.margins.left, this.currentY);
    this.currentY += 8;
    this.pdf.setFont('helvetica', 'normal');
  }

  private calculateStatistics(scheduledSlots: ScheduledSlot[]) {
    const uniqueCourses = new Set(scheduledSlots.map(slot => slot.course_name).filter(Boolean));
    const uniqueTeachers = new Set(scheduledSlots.map(slot => slot.teacher_name).filter(Boolean));
    const uniqueSections = new Set(scheduledSlots.map(slot => slot.section_code).filter(Boolean));
    const uniqueRooms = new Set(scheduledSlots.map(slot => slot.room_id).filter(Boolean));
    
    const dailyCount = Array(5).fill(0);
    scheduledSlots.forEach(slot => {
      if (slot.day_of_week >= 0 && slot.day_of_week < 5) {
        dailyCount[slot.day_of_week]++;
      }
    });
    
    const peakDay = dailyCount.indexOf(Math.max(...dailyCount));
    const peakDaySessions = Math.max(...dailyCount);
    const avgSessionsPerDay = scheduledSlots.length / 5;

    return {
      totalSessions: scheduledSlots.length,
      uniqueCourses: uniqueCourses.size,
      uniqueTeachers: uniqueTeachers.size,
      uniqueSections: uniqueSections.size,
      uniqueRooms: uniqueRooms.size,
      peakDay,
      peakDaySessions,
      avgSessionsPerDay
    };
  }

  private getDailyStatistics(scheduledSlots: ScheduledSlot[]) {
    const dailyCount = Array(5).fill(0);
    scheduledSlots.forEach(slot => {
      if (slot.day_of_week >= 0 && slot.day_of_week < 5) {
        dailyCount[slot.day_of_week]++;
      }
    });

    return DAYS.map((name, index) => ({
      name,
      sessions: dailyCount[index]
    }));
  }

  private groupSlotsBySection(scheduledSlots: ScheduledSlot[]): { [key: string]: ScheduledSlot[] } {
    const groups: { [key: string]: ScheduledSlot[] } = {};
    
    scheduledSlots.forEach(slot => {
      const section = slot.section_code || 'Unknown';
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(slot);
    });

    // Sort slots within each section by day and time
    Object.keys(groups).forEach(section => {
      groups[section].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) {
          return a.day_of_week - b.day_of_week;
        }
        return a.start_time.localeCompare(b.start_time);
      });
    });

    return groups;
  }

  private getTimeSlotIndex(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 8 * 60; // 8:00 AM
    return Math.floor((totalMinutes - startMinutes) / 55);
  }

  private generateFilename(timetable: TimetableData): string {
    const cleanName = timetable.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    return `${cleanName}_timetable_${date}.pdf`;
  }
}

// Convenience functions for common export scenarios
export const exportTimetablePDF = async (
  timetable: TimetableData,
  scheduledSlots: ScheduledSlot[],
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  const exporter = new PDFExporter(options);
  await exporter.exportTimetable(timetable, scheduledSlots, options);
};

export const exportSectionTimetable = async (
  timetable: TimetableData,
  scheduledSlots: ScheduledSlot[],
  sectionCode: string
): Promise<void> => {
  const filteredSlots = scheduledSlots.filter(slot => slot.section_code === sectionCode);
  const modifiedTimetable = {
    ...timetable,
    name: `${timetable.name} - Section ${sectionCode}`
  };
  
  await exportTimetablePDF(modifiedTimetable, filteredSlots, {
    includeCalendar: true,
    includeDetails: true,
    includeSummary: false
  });
};

export const exportTeacherTimetable = async (
  timetable: TimetableData,
  scheduledSlots: ScheduledSlot[],
  teacherName: string
): Promise<void> => {
  const filteredSlots = scheduledSlots.filter(slot => slot.teacher_name === teacherName);
  const modifiedTimetable = {
    ...timetable,
    name: `${timetable.name} - ${teacherName}`
  };
  
  await exportTimetablePDF(modifiedTimetable, filteredSlots, {
    includeCalendar: true,
    includeDetails: true,
    includeSummary: false
  });
};

export const exportClassroomTimetable = async (
  timetable: TimetableData,
  scheduledSlots: ScheduledSlot[],
  roomId: string
): Promise<void> => {
  const filteredSlots = scheduledSlots.filter(slot => slot.room_id === roomId);
  const modifiedTimetable = {
    ...timetable,
    name: `${timetable.name} - Room ${roomId}`
  };
  
  await exportTimetablePDF(modifiedTimetable, filteredSlots, {
    includeCalendar: true,
    includeDetails: true,
    includeSummary: false
  });
};
