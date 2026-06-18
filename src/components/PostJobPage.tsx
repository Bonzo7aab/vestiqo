"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Upload, FileText, X, File, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useUserProfile } from "../contexts/AuthContext";
import { needsVerificationAttention } from "../lib/verification/needs-verification-attention";
import { createClient } from "../lib/supabase/client";
import { createJob, fetchJobById, updateManagerJob } from "../lib/database/jobs";
import { fetchUserPrimaryCompany } from "../lib/database/companies";
import { kontoCompanyDataHref } from "../lib/konto-tabs";
import { fetchAllCategoriesWithSubcategories } from "../lib/database/categories";
import type { CategoryWithSubcategories } from "../lib/database/categories";
import { fetchCompanyBuildings } from "../lib/database/buildings";
import type { Building } from "../types/building";
import {
  formatGroupedBuildingLabel,
  groupBuildingsForSelection,
  resolvePrimaryBuildingId,
} from "../lib/buildings/grouping";
import Link from "next/link";
import type { BudgetInput } from "../types/budget";
import { uploadJobAttachments, deleteJobAttachments } from "../lib/storage/job-attachments";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "./ui/dropzone";
import type { FileRejection } from "react-dropzone";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export interface PostJobPageProps {
  onBack: () => void;
  /** When set, form loads job for edit (manager-owned, no offers). */
  jobId?: string | null;
}

const DESCRIPTION_PLACEHOLDER =
  "Opisz usterkę, podaj piętro, czy potrzebny jest specjalistyczny sprzęt?";

type TimingPreset = "emergency" | "week" | "flex";
type BudgetMode = "amount" | "quote";

interface JobFormData {
  title: string;
  category: string;
  subcategory: string;
  description: string;
  additionalInfo: string;
}

function addDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function timingToUrgencyAndDeadline(preset: TimingPreset): {
  urgency: "low" | "medium" | "high";
  type: "regular" | "urgent" | "premium";
  deadline: string | undefined;
} {
  if (preset === "emergency") {
    return { urgency: "high", type: "urgent", deadline: undefined };
  }
  if (preset === "week") {
    return { urgency: "medium", type: "regular", deadline: addDaysFromToday(7) };
  }
  return { urgency: "low", type: "regular", deadline: undefined };
}

function inferTimingFromJob(row: {
  urgency?: string | null;
  deadline?: string | null;
}): TimingPreset {
  const u = (row.urgency || "").toLowerCase();
  if (u === "high") return "emergency";
  if (row.deadline) return "week";
  return "flex";
}

function inferBudgetMode(row: { budget_type?: string | null }): BudgetMode {
  return row.budget_type === "negotiable" ? "quote" : "amount";
}

export default function PostJobPage({ onBack, jobId: jobIdProp }: PostJobPageProps): React.ReactElement {
  const { user, isAuthenticated } = useUserProfile();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [isCheckingCompany, setIsCheckingCompany] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState<string>("");
  const [timingPreset, setTimingPreset] = useState<TimingPreset>("flex");
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("amount");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [loadingJob, setLoadingJob] = useState(!!jobIdProp);
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    category: "",
    subcategory: "",
    description: "",
    additionalInfo: "",
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [categoriesFromDb, setCategoriesFromDb] = useState<CategoryWithSubcategories[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const groupedBuildingOptions = useMemo(
    () => groupBuildingsForSelection(buildings),
    [buildings],
  );

  useEffect(() => {
    if (!buildingId || buildings.length === 0) return;
    const primaryId = resolvePrimaryBuildingId(buildingId, buildings);
    if (primaryId !== buildingId) {
      setBuildingId(primaryId);
    }
  }, [buildingId, buildings]);

  useEffect(() => {
    const checkCompany = async () => {
      if (!user?.id) {
        setIsCheckingCompany(false);
        return;
      }
      try {
        const { data: company } = await fetchUserPrimaryCompany(supabase, user.id);
        setHasCompany(!!company);
        if (company?.id) {
          const { data: bld } = await fetchCompanyBuildings(supabase, company.id);
          if (bld?.length) {
            setBuildings(bld);
          }
        }
      } catch (error) {
        console.error("Error checking company:", error);
        setHasCompany(false);
      } finally {
        setIsCheckingCompany(false);
      }
    };
    void checkCompany();
  }, [user, supabase]);

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      const { data } = await fetchAllCategoriesWithSubcategories(supabase);
      if (data) {
        setCategoriesFromDb(data);
      }
      setIsLoadingCategories(false);
    };
    void loadCategories();
  }, [supabase]);

  useEffect(() => {
    if (!jobIdProp || !user?.id) {
      setLoadingJob(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingJob(true);
      const { data: job, error } = await fetchJobById(supabase, jobIdProp);
      if (cancelled) return;
      if (error || !job) {
        toast.error("Nie znaleziono zgłoszenia lub brak dostępu");
        setLoadingJob(false);
        onBack();
        return;
      }
      if ((job.applications_count ?? 0) > 0) {
        toast.error("Nie można edytować zgłoszenia po otrzymaniu ofert");
        setLoadingJob(false);
        onBack();
        return;
      }
      const st = (job.status || "").toLowerCase();
      if (st !== "draft" && st !== "active" && st !== "collecting_offers") {
        toast.error(
          "Edycja jest dostępna tylko dla zgłoszeń w szkicu lub zbierających oferty",
        );
        setLoadingJob(false);
        onBack();
        return;
      }

      const subName =
        (job as unknown as { subcategory?: { name?: string } | null }).subcategory?.name || "";

      setFormData({
        title: job.title,
        category: job.category?.name || "",
        subcategory: subName,
        description: job.description,
        additionalInfo: job.additional_info || "",
      });
      setTimingPreset(inferTimingFromJob(job));
      setBudgetMode(inferBudgetMode(job));
      if (job.budget_type !== "negotiable" && job.budget_min != null) {
        setBudgetAmount(String(job.budget_min));
      } else {
        setBudgetAmount("");
      }
      const bid = (job as unknown as { building_id?: string | null }).building_id;
      if (bid) {
        setBuildingId(bid);
      }
      setExistingImageUrls(Array.isArray(job.images) ? [...job.images] : []);
      setLoadingJob(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [jobIdProp, user?.id, supabase, onBack]);

  const handleInputChange = (field: keyof JobFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const err = rejection.errors[0];
      if (err.code === "file-too-large") {
        toast.error(`Plik "${rejection.file.name}" jest zbyt duży. Maksymalny rozmiar: 10MB`);
      } else if (err.code === "file-invalid-type") {
        toast.error(
          `Nieprawidłowy typ pliku "${rejection.file.name}". Dozwolone: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX`,
        );
      } else {
        toast.error(`Błąd przy dodawaniu pliku "${rejection.file.name}": ${err.message}`);
      }
    }
    if (acceptedFiles.length > 0) {
      const maxFiles = 10;
      const totalCount = attachments.length + existingImageUrls.length;
      const remainingSlots = maxFiles - totalCount;
      if (remainingSlots <= 0) {
        toast.error(`Można dodać maksymalnie ${maxFiles} plików łącznie`);
        return;
      }
      const filesToAdd = acceptedFiles.slice(0, remainingSlots);
      setAttachments((prev) => [...prev, ...filesToAdd]);
      if (acceptedFiles.length > remainingSlots) {
        toast.warning(`Dodano ${remainingSlots} z ${acceptedFiles.length} plików (maksymalnie ${maxFiles})`);
      } else {
        toast.success(`Dodano ${filesToAdd.length} plik${filesToAdd.length > 1 ? "i" : ""}`);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingUrl = (url: string) => {
    setExistingImageUrls((prev) => prev.filter((u) => u !== url));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const isImageFile = (file: File): boolean => file.type.startsWith("image/");

  const previewUrls = useMemo(() => {
    const urls = new Map<number, string>();
    attachments.forEach((file, index) => {
      if (isImageFile(file)) {
        urls.set(index, URL.createObjectURL(file));
      }
    });
    return urls;
  }, [attachments]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      toast.error("Musisz być zalogowany");
      return;
    }
    if (!formData.category) {
      toast.error("Proszę wybrać kategorię");
      return;
    }
    if (!formData.subcategory) {
      toast.error("Proszę wybrać podkategorię");
      return;
    }
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Proszę wypełnić tytuł i opis");
      return;
    }
    if (buildings.length > 0 && !buildingId) {
      toast.error("Wybierz nazwę nieruchomości");
      return;
    }
    if (budgetMode === "amount") {
      const cleaned = budgetAmount.replace(/[^\d.,]/g, "").replace(",", ".");
      const v = parseFloat(cleaned);
      if (!budgetAmount.trim() || Number.isNaN(v) || v <= 0) {
        toast.error("Podaj prawidłową kwotę netto lub wybierz „Potrzebna wycena”");
        return;
      }
    }

    if (needsVerificationAttention(user)) {
      toast.error(
        "Twoje konto oczekuje na weryfikację. Dodawanie zgłoszeń będzie możliwe po akceptacji przez administratora.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Brak aktywnej sesji. Zaloguj się ponownie.");
      }
      const managerId = sessionData.session.user.id;
      const company = await fetchUserPrimaryCompany(supabase, managerId);
      if (!company.data) {
        toast.error("Nie znaleziono firmy. Uzupełnij dane firmy w profilu.");
        return;
      }

      const { urgency, type, deadline } = timingToUrgencyAndDeadline(timingPreset);
      let budgetMin: number | undefined;
      let budgetMax: number | undefined;
      let budgetType: BudgetInput["type"] = "fixed";
      if (budgetMode === "quote") {
        budgetType = "negotiable";
        budgetMin = undefined;
        budgetMax = undefined;
      } else {
        const cleanedBudget = budgetAmount.replace(/[^\d.,]/g, "").replace(",", ".");
        const budgetValue = parseFloat(cleanedBudget);
        budgetMin = budgetValue;
        budgetMax = budgetValue;
        budgetType = "fixed";
      }
      const budgetInput: BudgetInput = {
        min: budgetMin,
        max: budgetMax,
        type: budgetType,
        currency: "PLN",
      };

      let newUploadedUrls: string[] = [];
      if (attachments.length > 0) {
        setIsUploading(true);
        try {
          const uploadResult = await uploadJobAttachments(
            attachments,
            managerId,
            jobIdProp || undefined,
          );
          if (uploadResult.errors.length > 0) {
            const errorMessages = uploadResult.errors
              .map(
                (err: unknown) =>
                  `${(err as { file?: string }).file || "Plik"}: ${(err as { error?: { message?: string } }).error?.message || "Błąd"}`,
              )
              .join(", ");
            toast.error(`Niektóre pliki nie zostały przesłane: ${errorMessages}`);
          }
          if (uploadResult.data.length > 0) {
            newUploadedUrls = uploadResult.data.map((r) => r.url);
            setUploadedFileUrls(newUploadedUrls);
          } else if (attachments.length > 0) {
            throw new Error("Nie udało się przesłać plików");
          }
        } finally {
          setIsUploading(false);
        }
      }

      const mergedImages =
        [...existingImageUrls, ...newUploadedUrls].length > 0
          ? [...existingImageUrls, ...newUploadedUrls]
          : undefined;

      if (jobIdProp) {
        const jobResult = await updateManagerJob(supabase, {
          jobId: jobIdProp,
          managerId,
          companyId: company.data.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          subcategory: formData.subcategory,
          buildingId: buildingId || null,
          budgetMin: budgetInput.min ?? null,
          budgetMax: budgetInput.max ?? null,
          budgetType: budgetInput.type || "fixed",
          currency: budgetInput.currency || "PLN",
          deadline: deadline ?? null,
          urgency,
          type,
          isPublic: true,
          additionalInfo: formData.additionalInfo.trim() || null,
          images: mergedImages ?? null,
        });
        if (jobResult.error) {
          throw new Error(
            jobResult.error instanceof Error
              ? jobResult.error.message
              : (jobResult.error as { message?: string }).message ||
                  "Nie udało się zapisać zmian",
          );
        }
        toast.success("Zgłoszenie zostało zaktualizowane");
      } else {
        const jobResult = await createJob(supabase, {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          subcategory: formData.subcategory,
          buildingId: buildingId || null,
          budgetMin: budgetInput.min,
          budgetMax: budgetInput.max,
          budgetType: budgetInput.type || "fixed",
          currency: budgetInput.currency || "PLN",
          deadline,
          urgency,
          status: "collecting_offers",
          type,
          isPublic: true,
          additionalInfo: formData.additionalInfo.trim() || undefined,
          images: mergedImages,
          managerId,
          companyId: company.data.id,
        });
        if (jobResult.error) {
          throw new Error(
            jobResult.error instanceof Error
              ? jobResult.error.message
              : (jobResult.error as { message?: string }).message ||
                  "Nie udało się utworzyć zgłoszenia",
          );
        }
        if (!jobResult.data) {
          throw new Error("Brak danych zwrotnych z serwera");
        }
        toast.success(`Zgłoszenie „${formData.title.trim()}” zostało opublikowane`);
      }

      setAttachments([]);
      setUploadedFileUrls([]);
      setTimeout(() => onBack(), 800);
    } catch (error: unknown) {
      console.error(error);
      if (uploadedFileUrls.length > 0) {
        try {
          await deleteJobAttachments(uploadedFileUrls);
        } catch {
          /* ignore */
        }
        setUploadedFileUrls([]);
      }
      toast.error(error instanceof Error ? error.message : "Wystąpił błąd");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (isCheckingCompany || loadingJob) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="ml-2 text-sm text-muted-foreground">Ładowanie...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasCompany) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center space-y-4 gap-2 flex flex-col justify-center">
              <p className="text-muted-foreground">Nie znaleziono firmy. Uzupełnij dane firmy w profilu.</p>
              <Link href={kontoCompanyDataHref('manager')}>
                <Button>Dodaj dane firmy w profilu</Button>
              </Link>
              <Button variant="outline" onClick={onBack} className="mt-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Powrót
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isEdit = Boolean(jobIdProp);
  const pageTitle = isEdit ? "Edytuj zgłoszenie" : "Dodaj zgłoszenie";
  const pageSubtitle = isEdit
    ? "Zapisz zmiany przed pojawieniem się ofert"
    : "Opublikuj zgłoszenie dla wykonawców";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="hidden md:flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Powrót
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{pageTitle}</h1>
              <p className="text-gray-600">{pageSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Podstawowe informacje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">Tytuł *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="np. Naprawa przecieku w piwnicy"
                  required
                />
              </div>

              <div>
                <Label>Nazwa nieruchomości *</Label>
                {buildings.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    Brak zapisanych nieruchomości. Do czasu dodania używany będzie adres siedziby firmy z profilu.
                  </p>
                ) : (
                  <Select value={buildingId} onValueChange={setBuildingId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="np. Wspólnota Przykładowa 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedBuildingOptions.map((group) => (
                        <SelectItem key={group.key} value={group.primaryBuildingId}>
                          {formatGroupedBuildingLabel(group)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Kategoria *</Label>
                  {isLoadingCategories ? (
                    <div className="h-10 bg-gray-100 rounded-md animate-pulse mt-1" />
                  ) : (
                    <Select
                      value={formData.category}
                      onValueChange={(value) => {
                        handleInputChange("category", value);
                        handleInputChange("subcategory", "");
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Wybierz kategorię" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesFromDb.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label>Podkategoria *</Label>
                  {isLoadingCategories ? (
                    <div className="h-10 bg-gray-100 rounded-md animate-pulse mt-1" />
                  ) : (
                    <Select
                      value={formData.subcategory}
                      onValueChange={(value) => handleInputChange("subcategory", value)}
                      disabled={!formData.category}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Wybierz podkategorię" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.category &&
                          categoriesFromDb
                            .find((c) => c.name === formData.category)
                            ?.subcategories.map((sub) => (
                              <SelectItem key={sub.id} value={sub.name}>
                                {sub.name}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Szczegóły techniczne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="description">Opis *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder={DESCRIPTION_PLACEHOLDER}
                  rows={6}
                  required
                  className="placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <Label className="text-base font-medium">Załączniki</Label>
                <Dropzone
                  accept={{
                    "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"],
                    "application/pdf": [".pdf"],
                    "application/msword": [".doc"],
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                  }}
                  maxFiles={10}
                  maxSize={10 * 1024 * 1024}
                  minSize={1024}
                  onDrop={handleFileUpload}
                  disabled={
                    attachments.length + existingImageUrls.length >= 10 || isSubmitting || isUploading
                  }
                  src={attachments}
                  className="mt-2"
                >
                  <DropzoneEmptyState>
                    <div className="flex flex-col items-center justify-center py-10">
                      <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                      <span className="text-lg font-semibold text-primary">Dodaj</span>
                      <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
                        Przeciągnij pliki lub kliknij w obszar. JPG, PNG, WEBP, GIF, PDF, DOC, DOCX — max 10 plików,
                        10&nbsp;MB każdy.
                      </p>
                    </div>
                  </DropzoneEmptyState>
                  <DropzoneContent>
                    <div className="flex flex-col items-center justify-center py-4">
                      <p className="text-sm font-medium">
                        {attachments.length + existingImageUrls.length} / 10 plików
                      </p>
                      <p className="text-xs text-muted-foreground">Kliknij, aby dodać więcej</p>
                    </div>
                  </DropzoneContent>
                </Dropzone>
              </div>

              {existingImageUrls.length > 0 && (
                <div className="space-y-2">
                  <Label>Obecne załączniki</Label>
                  <div className="flex flex-wrap gap-2">
                    {existingImageUrls.map((url) => (
                      <div
                        key={url}
                        className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs max-w-full"
                      >
                        <span className="truncate max-w-[200px]" title={url}>
                          {url.split("/").pop()}
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeExistingUrl(url)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="space-y-3">
                  <Label>Nowe pliki ({attachments.length})</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attachments.map((file, index) => {
                      const previewUrl = previewUrls.get(index) || null;
                      return (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          {previewUrl ? (
                            <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-gray-300">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 flex-shrink-0 rounded bg-gray-200 flex items-center justify-center border border-gray-300">
                              <File className="h-6 w-6 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            <div className="mt-1">
                              {isImageFile(file) ? (
                                <Badge variant="secondary" className="text-xs">
                                  <ImageIcon className="h-3 w-3 mr-1" />
                                  Obraz
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <File className="h-3 w-3 mr-1" />
                                  Dokument
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            disabled={isSubmitting || isUploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Czas i budżet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="mb-3 block">Termin realizacji</Label>
                <RadioGroup
                  value={timingPreset}
                  onValueChange={(v) => setTimingPreset(v as TimingPreset)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="emergency" id="t1" />
                    <Label htmlFor="t1" className="font-normal cursor-pointer">
                      Awaria — realizacja natychmiast
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="week" id="t2" />
                    <Label htmlFor="t2" className="font-normal cursor-pointer">
                      Pilne — realizacja w ciągu tygodnia
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flex" id="t3" />
                    <Label htmlFor="t3" className="font-normal cursor-pointer">
                      Do ustalenia
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="mb-3 block">Budżet netto</Label>
                <RadioGroup
                  value={budgetMode}
                  onValueChange={(v) => setBudgetMode(v as BudgetMode)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="amount" id="b1" />
                    <Label htmlFor="b1" className="font-normal cursor-pointer">
                      Wpisz kwotę
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="quote" id="b2" />
                    <Label htmlFor="b2" className="font-normal cursor-pointer">
                      Potrzebna wycena
                    </Label>
                  </div>
                </RadioGroup>
                {budgetMode === "amount" && (
                  <div className="mt-3 max-w-xs">
                    <Label htmlFor="budgetAmount">Kwota netto (PLN)</Label>
                    <Input
                      id="budgetAmount"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="np. 1500"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dodatkowe informacje (opcjonalnie)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.additionalInfo}
                onChange={(e) => handleInputChange("additionalInfo", e.target.value)}
                placeholder="Inne uwagi…"
                rows={3}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={onBack}>
              Anuluj
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || isUploading}>
              {isUploading
                ? "Przesyłanie…"
                : isSubmitting
                  ? "Zapisywanie…"
                  : isEdit
                    ? "Zapisz zmiany"
                    : "Opublikuj zgłoszenie"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
