using Pos.Application.CashShift.DTOs;

namespace Pos.Application.CashShift.Services;

public interface ICashShiftApplicationService
{
    Task<CashShiftDto?> GetCurrentOpenShiftAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<CashShiftDto> OpenShiftAsync(OpenCashShiftDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CashShiftDto> RegisterDepositAsync(CashDepositDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CashShiftDto> RegisterWithdrawalAsync(CashWithdrawalDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CashShiftDto> GenerateXReportAsync(Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CashShiftDto> CloseShiftAsync(CloseCashShiftDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<List<CashShiftDto>> GetShiftHistoryAsync(CancellationToken cancellationToken = default);
    Task<List<CashGeneralMovementDto>> GetGeneralMovementsAsync(CancellationToken cancellationToken = default);
}
