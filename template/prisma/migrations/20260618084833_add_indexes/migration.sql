-- CreateIndex
CREATE INDEX "feedbacks_to_id_idx" ON "feedbacks"("to_id");

-- CreateIndex
CREATE INDEX "feedbacks_from_id_idx" ON "feedbacks"("from_id");

-- CreateIndex
CREATE INDEX "feedbacks_sprint_id_idx" ON "feedbacks"("sprint_id");

-- CreateIndex
CREATE INDEX "feedbacks_created_at_idx" ON "feedbacks"("created_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "users_member_name_idx" ON "users"("member_name");
