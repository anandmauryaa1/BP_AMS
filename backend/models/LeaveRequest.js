import mongoose, { Schema } from 'mongoose';
const LeaveRequestSchema = new Schema({
    employeeId: { type: String, required: true },
    employeeName: { type: String },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    leaveType: { 
        type: String, 
        enum: ['CASUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'OTHER'],
        required: true,
        default: function () {
            return this.type || 'CASUAL';
        },
    },
    type: { 
        type: String, 
        enum: ['CASUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'OTHER'],
        default: function () {
            return this.leaveType || 'CASUAL';
        },
    },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
}, { timestamps: true });

// ESR Compound Index Rule: Equality (employeeId, status), Sort/Range (startDate DESC)
LeaveRequestSchema.index({ employeeId: 1, status: 1, startDate: -1 });

LeaveRequestSchema.pre('validate', function (next) {
    if (!this.leaveType && this.type) {
        this.leaveType = this.type;
    }
    if (!this.type && this.leaveType) {
        this.type = this.leaveType;
    }
    if (!this.leaveType) {
        this.leaveType = 'CASUAL';
    }
    if (!this.type) {
        this.type = this.leaveType;
    }
    if (typeof next === 'function') next();
});

export const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema);

