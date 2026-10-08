import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi, DocumentInfo, DocumentSummary, RedFlag, QuestionItem, MessageItem, UsageSummary } from "../api/client";

export const useDocument = (id: number) => {
  return useQuery<DocumentInfo>({
    queryKey: ["document", id],
    queryFn: () => documentApi.get(id),
    enabled: !!id && !isNaN(id),
  });
};

export const useDocuments = () => {
  return useQuery<DocumentInfo[]>({
    queryKey: ["documents"],
    queryFn: () => documentApi.list(),
  });
};

export const useDocumentSummary = (id: number) => {
  return useQuery<DocumentSummary>({
    queryKey: ["document", id, "summary"],
    queryFn: () => documentApi.getSummary(id),
    enabled: !!id && !isNaN(id),
  });
};

export const useDocumentRedFlags = (id: number) => {
  return useQuery<RedFlag[]>({
    queryKey: ["document", id, "red-flags"],
    queryFn: () => documentApi.getRedFlags(id),
    enabled: !!id && !isNaN(id),
  });
};

export const useDocumentQuestions = (id: number) => {
  return useQuery<QuestionItem[]>({
    queryKey: ["document", id, "questions"],
    queryFn: () => documentApi.getQuestions(id),
    enabled: !!id && !isNaN(id),
  });
};

export const useDocumentConversation = (id: number) => {
  return useQuery<{ id: number; document_id: number }>({
    queryKey: ["document", id, "conversation"],
    queryFn: () => documentApi.getConversation(id),
    enabled: !!id && !isNaN(id),
  });
};

export const useConversationMessages = (convId: number | undefined) => {
  return useQuery<MessageItem[]>({
    queryKey: ["conversation", convId, "messages"],
    queryFn: () => (convId ? documentApi.getMessages(convId) : Promise.resolve([])),
    enabled: !!convId,
  });
};

export const useUsage = () => {
  return useQuery<UsageSummary>({
    queryKey: ["usage"],
    queryFn: () => documentApi.getUsage(),
    refetchInterval: 15000,
  });
};
