import { useQuery } from "@tanstack/react-query";
import { documentApi } from "../api/client";
export const useDocument = (id) => {
    return useQuery({
        queryKey: ["document", id],
        queryFn: () => documentApi.get(id),
        enabled: !!id && !isNaN(id),
    });
};
export const useDocuments = () => {
    return useQuery({
        queryKey: ["documents"],
        queryFn: () => documentApi.list(),
    });
};
export const useDocumentSummary = (id) => {
    return useQuery({
        queryKey: ["document", id, "summary"],
        queryFn: () => documentApi.getSummary(id),
        enabled: !!id && !isNaN(id),
    });
};
export const useDocumentRedFlags = (id) => {
    return useQuery({
        queryKey: ["document", id, "red-flags"],
        queryFn: () => documentApi.getRedFlags(id),
        enabled: !!id && !isNaN(id),
    });
};
export const useDocumentQuestions = (id) => {
    return useQuery({
        queryKey: ["document", id, "questions"],
        queryFn: () => documentApi.getQuestions(id),
        enabled: !!id && !isNaN(id),
    });
};
export const useDocumentConversation = (id) => {
    return useQuery({
        queryKey: ["document", id, "conversation"],
        queryFn: () => documentApi.getConversation(id),
        enabled: !!id && !isNaN(id),
    });
};
export const useConversationMessages = (convId) => {
    return useQuery({
        queryKey: ["conversation", convId, "messages"],
        queryFn: () => (convId ? documentApi.getMessages(convId) : Promise.resolve([])),
        enabled: !!convId,
    });
};
export const useUsage = () => {
    return useQuery({
        queryKey: ["usage"],
        queryFn: () => documentApi.getUsage(),
        refetchInterval: 15000,
    });
};
