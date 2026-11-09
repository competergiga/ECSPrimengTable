using Data.PrimengTableReusableComponent;
using ECSPrimengTableExample.Interfaces;
using ECSPrimengTableExample.Repository;
using ECSPrimengTableExample.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

namespace ECSPrimengTableExample {
    public class Program {
        public static async Task Main(string[] args) {
            await CreateHostBuilder(args).Build().RunAsync();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) {
            return Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder => webBuilder.UseStartup<Startup>());
        }
    }

    public class Startup {
        private readonly IConfiguration configuration;

        public Startup(IConfiguration configuration) {
            this.configuration = configuration;
        }

        public void ConfigureServices(IServiceCollection services) {
            services.AddControllers();
            services.AddSwaggerGen(options => {
                options.SwaggerDoc("v1", new OpenApiInfo {
                    Title = "PrimeNG table reusable component",
                    Version = "1.0",
                    Description = "This is the demo API to show how to use the PrimeNG table reusable component.",
                    Contact = new OpenApiContact {
                        Name = "Eternal CODE Studio",
                        Email = "eternalcodestudio@gmail.com"
                    }
                });
                options.EnableAnnotations();
            });
            services.AddDbContext<primengTableReusableComponentContext>(options => {
                options.UseSqlServer(configuration.GetConnectionString("DB_primengtablereusablecomponent"));
            });
            services.AddScoped<ITestService, TestService>();
            services.AddScoped<ITestRepository, TestRepository>();
            services.AddCors();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment environment) {
            app.UseRouting();
            app.UseCors(options => options.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
            if (environment.IsDevelopment()) {
                app.UseSwagger();
                app.UseSwaggerUI();
            }
            app.UseHttpsRedirection();
            app.UseAuthorization();
            app.UseEndpoints(endpoints => endpoints.MapControllers());
        }
    }
}