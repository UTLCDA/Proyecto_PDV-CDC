using Pos.Application.CashShift.DTOs;
using Pos.Application.Common.Models;

namespace Pos.Application.CashShift.Services;

public interface ICashShiftApplicationService
{
    Task<CashShiftDto?> GetCurrentOpenShiftAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<CashShiftDto> OpenShiftAsync(OpenCashShiftDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CashShiftDto> RegisterDepositAsync(CashDepositDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CashShiftDto> RegisterWithdrawalAsync(CashWithdrawalDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CashShiftDto> GenerateXReportAsync(Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<CashShiftDto> CloseShiftAsync(CloseCashShiftDto request, Guid userId, string correlationId, string ipAddress, CancellationToken cancellationToken = default);
    Task<PagedResult<CashShiftDto>> GetShiftHistoryAsync(
        int pageNumber = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null,
        CancellationToken cancellationToken = default);
    Task<PagedResult<CashGeneralMovementDto>> GetGeneralMovementsAsync(
        int pageNumber = 1,
        int pageSize = 25,
        string? sortBy = null,
        string? sortDirection = null,
        CancellationToken cancellationToken = default);
}
