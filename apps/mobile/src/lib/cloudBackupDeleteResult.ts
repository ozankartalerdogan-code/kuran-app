export type DeleteStepStatus = "deleted" | "not-found" | "failed" | "not-attempted";

export interface CloudBackupDeleteResult {
  firestore: DeleteStepStatus;
  account: DeleteStepStatus;
  backupDisabled: boolean;
}

export interface CloudBackupDeleteFeedback {
  title: string;
  message: string;
  disabled: boolean;
}

export function getCloudBackupDeleteFeedback(
  result: CloudBackupDeleteResult,
): CloudBackupDeleteFeedback {
  if (result.firestore === "deleted" && result.account === "deleted" && result.backupDisabled) {
    return {
      title: "Silindi",
      message: "Bulut yedeğiniz ve anonim hesabınız kalıcı olarak silindi.",
      disabled: true,
    };
  }
  if (result.firestore === "deleted" && result.account === "failed" && result.backupDisabled) {
    return {
      title: "Yedek Silindi",
      message: "Bulut yedeğiniz silindi; ancak anonim Firebase hesabı silinemedi. Bulut yedekleme kapatıldı. Destek için gizlilik ekranındaki iletişim adresini kullanabilirsiniz.",
      disabled: true,
    };
  }
  if (result.firestore === "not-found" && result.account === "not-found" && result.backupDisabled) {
    return {
      title: "Yedekleme Kapatıldı",
      message: "Silinecek etkin bir bulut yedeği veya anonim hesap bulunamadı. Bulut yedekleme kapatıldı.",
      disabled: true,
    };
  }
  if (result.firestore === "deleted" && !result.backupDisabled) {
    return {
      title: "Kısmen Silindi",
      message: "Bulut yedeğiniz silindi; ancak yedekleme bu cihazda kapatılamadı. Uygulamayı yeniden açmadan önce işlemi tekrar deneyin.",
      disabled: false,
    };
  }
  return {
    title: "Silinemedi",
    message: "Bulut yedeği silinemedi. İnternet bağlantınızı kontrol edip yeniden deneyin.",
    disabled: false,
  };
}
