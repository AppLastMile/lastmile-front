import {
  assignShipmentVolunteer,
  createPickupPoint,
  getPickupPoints,
  getShipments,
} from "./logisticsService";
import { httpClient } from "./httpClient";

jest.mock("./httpClient", () => ({
  httpClient: jest.fn(),
}));

const mockedHttpClient = httpClient as jest.MockedFunction<typeof httpClient>;

describe("logisticsService", () => {
  beforeEach(() => {
    mockedHttpClient.mockReset();
  });

  it("gets pickup points with defaults", async () => {
    mockedHttpClient.mockResolvedValueOnce({ data: [] } as never);

    await getPickupPoints();

    expect(mockedHttpClient).toHaveBeenCalledWith(
      "/logistics/pickup-points?page=1&limit=100",
    );
  });

  it("creates pickup point", async () => {
    const payload = {
      name: "P1",
      address: "Calle 1",
      city: "Bogota",
      eventId: 10,
    };
    mockedHttpClient.mockResolvedValueOnce({ id: 1 } as never);

    await createPickupPoint(payload);

    expect(mockedHttpClient).toHaveBeenCalledWith("/logistics/pickup-points", {
      method: "POST",
      body: payload,
    });
  });

  it("gets shipments with custom pagination", async () => {
    mockedHttpClient.mockResolvedValueOnce({ data: [] } as never);

    await getShipments(2, 30);

    expect(mockedHttpClient).toHaveBeenCalledWith(
      "/logistics/shipments?page=2&limit=30",
    );
  });

  it("gets shipments with default pagination", async () => {
    mockedHttpClient.mockResolvedValueOnce({ data: [] } as never);

    await getShipments();

    expect(mockedHttpClient).toHaveBeenCalledWith(
      "/logistics/shipments?page=1&limit=100",
    );
  });

  it("assigns volunteer to shipment", async () => {
    mockedHttpClient.mockResolvedValueOnce({ id: 3 } as never);

    await assignShipmentVolunteer(3, 44);

    expect(mockedHttpClient).toHaveBeenCalledWith(
      "/logistics/shipments/3/assign-volunteer",
      {
        method: "PATCH",
        body: { volunteerId: 44 },
      },
    );
  });
});
