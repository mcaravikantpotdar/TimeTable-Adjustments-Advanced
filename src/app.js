import { loadInitialState, initStorageSync, exportData, importData } from './state/storage.js';
import { undo } from './state/history.js';
import { autoAdjust } from './core/autoAdjustEngine.js';
import {
    updateTooltipPos, hideTooltip, showNameTooltip,
    handleTeaMouseOver, handleTeaMouseLeave, showClashTooltip
} from './ui/notifications.js';
import {
    openPerModal, savePeriod, deletePeriod,
    openClsModal, saveClass, deleteClass,
    openRegModal, saveRegistry, deleteRegistry, closeModal,
    openReportModal, closeReportModal, updateReportTargets, executePrintReport
} from './ui/modals.js';
import {
    render, toggleSidebar, expandSidebar, updateSchoolName, wipeClear,
    handleGenericDrop, handleTargetedDrop, clearValue, deleteSplit,
    toggleAllDays, toggleStrip, toggleDay, closeAllStrips
} from './ui/gridRenderer.js';
import {
    openAdjustments, closeAdjustments, goToSetupView, goToAssignView,
    renderAdjTeachers, removeCover, clearAllCovers
} from './ui/adjustmentModal.js';
import { printCirculation } from './print/circulationSheet.js';
import { printTeacherDailySlips } from './print/teacherDocket.js';

// Expose functions globally for inline HTML event handlers
Object.assign(window, {
    // Grid & UI
    render, toggleSidebar, expandSidebar, updateSchoolName, wipeClear,
    handleGenericDrop, handleTargetedDrop, clearValue, deleteSplit,
    toggleAllDays, toggleStrip, toggleDay, closeAllStrips,
    // Notifications & Tooltips
    updateTooltipPos, hideTooltip, showNameTooltip,
    handleTeaMouseOver, handleTeaMouseLeave, showClashTooltip,
    // History & Storage
    undo, exportData, importData,
    // Modals & Reports
    openPerModal, savePeriod, deletePeriod,
    openClsModal, saveClass, deleteClass,
    openRegModal, saveRegistry, deleteRegistry, closeModal,
    openReportModal, closeReportModal, updateReportTargets, executePrintReport,
    // Daily Adjustments & Print Slips
    openAdjustments, closeAdjustments, goToSetupView, goToAssignView,
    renderAdjTeachers, removeCover, clearAllCovers, autoAdjust,
    printCirculation, printTeacherDailySlips
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

// Initialize cross-tab synchronization
initStorageSync();

// Bootstrap application on load
window.onload = () => {
    loadInitialState();
    render();
    document.getElementById('adjDate').value = new Date().toISOString().split('T')[0];
};
