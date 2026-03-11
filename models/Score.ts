import mongoose, { Schema, Document } from 'mongoose';

export interface IScore extends Document {
    studentName: string;
    score: number;
    totalQuestions: number;
    timeSpent: number; // in seconds
    gameType: string;
    createdAt: Date;
}

const ScoreSchema = new Schema<IScore>({
    studentName: {
        type: String,
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    totalQuestions: {
        type: Number,
        required: true,
        default: 10,
    },
    timeSpent: {
        type: Number,
        required: true,
    },
    gameType: {
        type: String,
        default: 'double-half',
    },
}, {
    timestamps: true,
});

export default mongoose.models.Score || mongoose.model<IScore>('Score', ScoreSchema);
