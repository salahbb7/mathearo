import mongoose, { Schema, Document } from 'mongoose';

export interface IGameSession extends Document {
    studentId?: mongoose.Types.ObjectId;
    studentName?: string;
    teacherId: mongoose.Types.ObjectId;
    gameName: string;
    score: number;
    totalQuestions: number;
    date: Date;
}

const GameSessionSchema = new Schema<IGameSession>({
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: false },
    studentName: { type: String, required: false },
    teacherId: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    gameName: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    date: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.GameSession || mongoose.model<IGameSession>('GameSession', GameSessionSchema);
