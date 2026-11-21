import mongoose from 'mongoose';

export const MAX_COMMENT_LENGTH = 1000;

// Bình luận trong một công việc. Lưu kèm project để kiểm tra quyền và xoá theo dự án nhanh.
const commentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: {
      type: String,
      required: [true, 'Hãy nhập nội dung bình luận'],
      trim: true,
      maxlength: [MAX_COMMENT_LENGTH, `Bình luận tối đa ${MAX_COMMENT_LENGTH} ký tự`],
    },
  },
  { timestamps: true, versionKey: false }
);

commentSchema.index({ task: 1, createdAt: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
