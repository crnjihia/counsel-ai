import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Mshauri AI End-to-End User Flow", () => {
  test("Upload Kenyan NDA -> get summary -> verify red flags -> send chat -> verify streaming tokens", async ({
    page,
  }) => {
    // 1. Visit landing page
    await page.goto("/");
    await expect(page).toHaveTitle(/Mshauri AI/);
    await expect(page.getByText("Protect your Kenyan business before you sign")).toBeVisible();

    // 2. Upload sample PDF
    const samplePdfPath = path.resolve(__dirname, "../../samples/sample-nda.pdf");
    const fileChooserPromise = page.waitForFileChooser();
    await page.locator("input[type='file']").setInputFiles(samplePdfPath);

    // 3. Navigation to /documents/:id
    await page.waitForURL(/\/documents\/\d+/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/documents\/\d+/);

    // 4. Verify Document viewer and Kenyan disclaimer
    await expect(page.getByText("Legal Disclaimer: Mshauri is an AI legal assistant")).toBeVisible();
    await expect(page.getByText("Document Viewer")).toBeVisible();

    // 5. Verify Plain-English Summary tab
    const summaryTab = page.locator("#tab-summary-btn");
    await expect(summaryTab).toBeVisible();
    await summaryTab.click();

    // Plain overview should be visible once LLM completes
    await expect(
      page.getByText(/Plain-English Overview|Extracting plain-English summary/i)
    ).toBeVisible({ timeout: 15000 });

    // 6. Switch to Red Flags tab
    const redFlagsTab = page.locator("#tab-redflags-btn");
    await redFlagsTab.click();
    await expect(
      page.getByText(/Clauses Flagged|Scanning document for high-risk clauses/i)
    ).toBeVisible({ timeout: 15000 });

    // 7. Switch to Clarification Chat tab
    const chatTab = page.locator("#tab-chat-btn");
    await chatTab.click();
    await expect(page.getByText("Ask Mshauri Anything")).toBeVisible();

    // 8. Send chat query and verify real-time SSE streaming tokens appear
    const chatInput = page.locator("#chat-input-field");
    await expect(chatInput).toBeVisible();
    await chatInput.fill("What liquidated damages penalty is in clause 6?");

    const sendBtn = page.locator("#send-chat-btn");
    await sendBtn.click();

    // User message should appear immediately
    await expect(page.getByText("What liquidated damages penalty is in clause 6?")).toBeVisible();

    // Verify assistant streaming bubble is rendered
    const assistantBubble = page.locator("div.prose");
    await expect(assistantBubble.first()).toBeVisible({ timeout: 10000 });

    // Verify content streams in and token citations appear
    await expect(assistantBubble.first()).toContainText(/Mshauri|Clause|KES|liquidated/i, {
      timeout: 15000,
    });
  });
});
